import { useState, useRef, useCallback, useMemo } from 'react';
import type { ReactElement } from 'react';
import { RoomJoin } from './components/RoomJoin';
import { Spellbook } from './components/Spellbook';
import { TalentTree } from './components/TalentTree';
import { QuickMath } from './components/puzzles/QuickMath';
import { TapSequence } from './components/puzzles/TapSequence';
import { Trivia } from './components/puzzles/Trivia';
import { PhaseAlign } from './components/puzzles/PhaseAlign';
import { PhoneNetClient } from './net/client';
import { tuningFor, type PuzzleOverrides, type TalentId } from './talents/talents';
import {
  loadTalents,
  saveTalents,
  earnStardust,
  unlockTalent,
  type TalentState,
} from './talents/save';
import type { PowerId } from '../shared/protocol';

const FEEDBACK: Record<PowerId, { title: string; color: string; sub: string }> = {
  'freeze-stars': { title: 'Cast!', color: '#7ad8ff', sub: 'Freeze Stars — enemies cold for 3s.' },
  'summon-platform': { title: 'Cast!', color: '#9a7aff', sub: 'Platform — bridge holds for 5s.' },
  'illuminate': { title: 'Cast!', color: '#f6c971', sub: 'Illuminate — dark zone revealed.' },
  'phase-dash': { title: 'Cast!', color: '#5eead4', sub: 'Phase Dash — slip through the plasma for 2.5s.' },
};

/**
 * Props every puzzle wrapper accepts. `tuning` carries the full per-power
 * override map; each wrapper selects its own slice. Keeping the param UNIFORM
 * across every entry is what lets the `satisfies Record<PowerId, …>` guard hold
 * (a per-key param type would break the correlated-union call below).
 */
type PuzzleProps = { onSolved: () => void; onCancel: () => void };
type PuzzleArgs = PuzzleProps & { tuning: PuzzleOverrides };

/**
 * Exhaustive puzzle router, keyed by PowerId. `satisfies Record<PowerId, …>`
 * makes a missing power a COMPILE error — adding a 5th PowerId without a phone
 * puzzle no longer silently renders a blank screen. Each wrapper spreads its
 * talent overrides (`tuning[power]`) over the base props; unset overrides fall
 * back to the component's own defaults.
 */
const PUZZLES = {
  'freeze-stars': ({ tuning, ...p }: PuzzleArgs) => <QuickMath {...p} {...tuning['freeze-stars']} />,
  'summon-platform': ({ tuning, ...p }: PuzzleArgs) => <TapSequence {...p} {...tuning['summon-platform']} />,
  'illuminate': ({ tuning, ...p }: PuzzleArgs) => <Trivia {...p} {...tuning['illuminate']} />,
  'phase-dash': ({ tuning, ...p }: PuzzleArgs) => <PhaseAlign {...p} {...tuning['phase-dash']} />,
} satisfies Record<PowerId, (p: PuzzleArgs) => ReactElement>;

type Phase =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'spellbook'; roomCode: string }
  | { kind: 'talents'; roomCode: string }
  | { kind: 'puzzle'; roomCode: string; power: PowerId }
  | { kind: 'cast-feedback'; roomCode: string; power: PowerId };

export function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [talents, setTalents] = useState<TalentState>(() => loadTalents());
  const clientRef = useRef<PhoneNetClient | null>(null);

  const tuning = useMemo(() => tuningFor(talents.unlocked), [talents.unlocked]);

  const handleJoin = useCallback(async (code: string) => {
    setPhase({ kind: 'connecting' });
    setError(null);

    clientRef.current?.close();
    const client = new PhoneNetClient();
    clientRef.current = client;

    client.onMessage((msg) => {
      if (msg.type === 'joined') {
        setPhase({ kind: 'spellbook', roomCode: msg.roomCode });
        setError(null);
      } else if (msg.type === 'error') {
        setError(msg.message);
        setPhase({ kind: 'idle' });
      }
    });

    try {
      await client.connect();
      client.send({ type: 'join-room', role: 'phone', roomCode: code });
    } catch {
      setError('Could not reach the game. Is the laptop dev server running?');
      setPhase({ kind: 'idle' });
    }
  }, []);

  const pickPower = useCallback(
    (power: PowerId) => {
      setPhase((p) => (p.kind === 'spellbook' ? { kind: 'puzzle', roomCode: p.roomCode, power } : p));
    },
    []
  );

  const openTalents = useCallback(() => {
    setPhase((p) => (p.kind === 'spellbook' ? { kind: 'talents', roomCode: p.roomCode } : p));
  }, []);

  const closeTalents = useCallback(() => {
    setPhase((p) => (p.kind === 'talents' ? { kind: 'spellbook', roomCode: p.roomCode } : p));
  }, []);

  const unlock = useCallback((id: TalentId) => {
    setTalents((t) => {
      const next = unlockTalent(t, id);
      if (next !== t) saveTalents(next);
      return next;
    });
  }, []);

  const onSolved = useCallback(() => {
    let wasPuzzle = false;
    setPhase((p) => {
      if (p.kind !== 'puzzle') return p;
      wasPuzzle = true;
      clientRef.current?.send({ type: 'puzzle-solved', powerId: p.power });
      return { kind: 'cast-feedback', roomCode: p.roomCode, power: p.power };
    });
    // Earn a stardust for the solve — but only for a genuine puzzle-phase solve,
    // so a stray/duplicate onSolved can't mint stardust without a cast.
    if (wasPuzzle) {
      setTalents((t) => {
        const next = earnStardust(t);
        saveTalents(next);
        return next;
      });
    }
    setTimeout(() => {
      setPhase((p) =>
        p.kind === 'cast-feedback' ? { kind: 'spellbook', roomCode: p.roomCode } : p
      );
    }, 1200);
  }, []);

  const onCancel = useCallback(() => {
    setPhase((p) => (p.kind === 'puzzle' ? { kind: 'spellbook', roomCode: p.roomCode } : p));
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      {renderPhase(phase, {
        handleJoin,
        pickPower,
        openTalents,
        closeTalents,
        unlock,
        onSolved,
        onCancel,
        error,
        talents,
        tuning,
      })}
    </div>
  );
}

function renderPhase(
  phase: Phase,
  actions: {
    handleJoin: (code: string) => void;
    pickPower: (id: PowerId) => void;
    openTalents: () => void;
    closeTalents: () => void;
    unlock: (id: TalentId) => void;
    onSolved: () => void;
    onCancel: () => void;
    error: string | null;
    talents: TalentState;
    tuning: PuzzleOverrides;
  }
) {
  if (phase.kind === 'idle' || phase.kind === 'connecting') {
    return (
      <div style={{ width: '100%', maxWidth: '320px' }}>
        {actions.error && (
          <div
            style={{
              background: '#3a1e28',
              border: '1px solid #7a3a4a',
              color: '#ffd3dc',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {actions.error}
          </div>
        )}
        <RoomJoin onJoin={actions.handleJoin} busy={phase.kind === 'connecting'} />
      </div>
    );
  }
  if (phase.kind === 'spellbook') {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '12px', opacity: 0.5 }}>Room {phase.roomCode}</span>
        <Spellbook onPick={actions.pickPower} onOpenTalents={actions.openTalents} stardust={actions.talents.stardust} />
      </div>
    );
  }
  if (phase.kind === 'talents') {
    return <TalentTree state={actions.talents} onUnlock={actions.unlock} onBack={actions.closeTalents} />;
  }
  if (phase.kind === 'puzzle') {
    return PUZZLES[phase.power]({ onSolved: actions.onSolved, onCancel: actions.onCancel, tuning: actions.tuning });
  }
  // cast-feedback
  const f = FEEDBACK[phase.power];
  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '36px', color: f.color, margin: 0 }}>{f.title}</h1>
      <p style={{ opacity: 0.6, marginTop: '8px' }}>{f.sub}</p>
    </div>
  );
}
