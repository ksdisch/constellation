import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { ReactElement } from 'react';
import { RoomJoin } from './components/RoomJoin';
import { Spellbook } from './components/Spellbook';
import { TalentTree } from './components/TalentTree';
import { QuickMath } from './components/puzzles/QuickMath';
import { TapSequence } from './components/puzzles/TapSequence';
import { Trivia } from './components/puzzles/Trivia';
import { PhaseAlign } from './components/puzzles/PhaseAlign';
import { PhoneNetClient } from './net/client';
import { tuningFor, strengthFor, type PuzzleOverrides, type TalentId } from './talents/talents';
import {
  loadTalents,
  saveTalents,
  earnStardust,
  unlockTalent,
  type TalentState,
} from './talents/save';
import type { PowerId, PuzzleTheme } from '../shared/protocol';
import { QUICK_MATH_TOTAL_SECONDS } from './components/puzzles/quickMathLogic';
import { TAP_SEQUENCE_TOTAL_SECONDS } from './components/puzzles/TapSequence';
import { TRIVIA_TIMER_SECONDS } from './components/puzzles/triviaLogic';
import { PHASE_ALIGN_TOTAL_SECONDS } from './components/puzzles/phaseAlignLogic';

/** Bonus stardust the phone earns when the laptop clears a planet (M8). */
const PLANET_BONUS = 3;

/**
 * Effective countdown length (seconds) each puzzle runs with, given the
 * player's talent tuning — the telemetry cap for solveMs (F-50). Defaults are
 * imported from the puzzles themselves so they can't drift; `satisfies` keeps
 * the map exhaustive against the power set.
 */
const PUZZLE_TIMER_SECONDS = {
  'freeze-stars': (t: PuzzleOverrides) => t['freeze-stars'].totalSeconds ?? QUICK_MATH_TOTAL_SECONDS,
  'summon-platform': (t: PuzzleOverrides) => t['summon-platform'].totalSeconds ?? TAP_SEQUENCE_TOTAL_SECONDS,
  'illuminate': (t: PuzzleOverrides) => t['illuminate'].timerSeconds ?? TRIVIA_TIMER_SECONDS,
  'phase-dash': (t: PuzzleOverrides) => t['phase-dash'].totalSeconds ?? PHASE_ALIGN_TOTAL_SECONDS,
} satisfies Record<PowerId, (t: PuzzleOverrides) => number>;

// Small-viewport height that tracks mobile browser chrome (F-52): dvh where
// the engine supports it, vh as the fallback for older mobile Safari.
const MIN_VIEWPORT_HEIGHT =
  typeof CSS !== 'undefined' && CSS.supports('min-height', '100dvh') ? '100dvh' : '100vh';

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
type PuzzleArgs = PuzzleProps & { tuning: PuzzleOverrides; theme: PuzzleTheme };

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
  | { kind: 'cast-feedback'; roomCode: string; power: PowerId }
  // The socket died mid-session (tab backgrounded, wifi blip). The room code
  // is remembered so rejoining is one tap — the relay keeps the room alive.
  | { kind: 'disconnected'; roomCode: string };

export function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  // Which planet the laptop is on, so puzzles can reskin to match. Set by the
  // game's `planet-started` message; defaults to the unchanged look.
  const [puzzleTheme, setPuzzleTheme] = useState<PuzzleTheme>('default');
  const [talents, setTalents] = useState<TalentState>(() => loadTalents());
  const clientRef = useRef<PhoneNetClient | null>(null);
  // When the current puzzle opened, so onSolved can report the solve duration
  // (the `solveMs` wire field) that feeds the laptop's rhythm portrait (M10).
  const puzzleStartRef = useRef<number>(0);

  const tuning = useMemo(() => tuningFor(talents.unlocked), [talents.unlocked]);

  // Which powers the phone player has strength-boosted. Refs re-synced every
  // render let the stable callbacks below read the CURRENT values — including
  // the current phase — without reaching into setState updaters, which must
  // stay pure under StrictMode's double-invocation (F-22).
  const strength = useMemo(() => strengthFor(talents.unlocked), [talents.unlocked]);
  const strengthRef = useRef(strength);
  strengthRef.current = strength;
  const tuningRef = useRef(tuning);
  tuningRef.current = tuning;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // Persist talents as an effect of state, never inside the updaters (F-22).
  // saveTalents never throws; the mount run just writes back the loaded state.
  useEffect(() => {
    saveTalents(talents);
  }, [talents]);

  // Transient "★ +N — planet cleared" toast, cleared after a beat. The timer is
  // tracked so back-to-back clears re-arm cleanly (no premature flicker) and a
  // pending timer is dropped on unmount.
  const [bonus, setBonus] = useState<number | null>(null);
  const bonusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The cast-feedback → spellbook return is a one-shot too; tracked for the
  // same clean unmount (F-48).
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (bonusTimerRef.current !== null) clearTimeout(bonusTimerRef.current);
    if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current);
  }, []);

  const handleJoin = useCallback(async (code: string) => {
    setPhase({ kind: 'connecting' });
    setError(null);

    clientRef.current?.close();
    const client = new PhoneNetClient();
    clientRef.current = client;

    // A dead socket flips to the connection-lost state with the room code
    // remembered for a one-tap rejoin (F-07). Fires only after a successful
    // open and never for the deliberate close() above.
    client.onClose(() => {
      setPhase({ kind: 'disconnected', roomCode: code });
    });

    client.onMessage((msg) => {
      if (msg.type === 'joined') {
        setPhase({ kind: 'spellbook', roomCode: msg.roomCode });
        setError(null);
      } else if (msg.type === 'planet-started') {
        // The laptop entered (or restarted) a planet — theme the puzzles to match.
        setPuzzleTheme(msg.theme);
      } else if (msg.type === 'planet-complete') {
        // The laptop cleared a planet — earn bonus stardust and flash a toast.
        setTalents((t) => earnStardust(t, PLANET_BONUS));
        setBonus(PLANET_BONUS);
        if (bonusTimerRef.current !== null) clearTimeout(bonusTimerRef.current);
        bonusTimerRef.current = setTimeout(() => setBonus(null), 2600);
      } else if (msg.type === 'peer-disconnected') {
        // The game left, and rooms die with their game: a rebooted laptop
        // mints a NEW code, so route to fresh input rather than a dead-code
        // rejoin. Distinct from fatal relay errors (F-18).
        setError('The game disconnected — start a room on the laptop and join again.');
        setPhase({ kind: 'idle' });
      } else if (msg.type === 'error') {
        setError(msg.message);
        setPhase({ kind: 'idle' });
      }
    });

    try {
      await client.connect();
      client.send({ type: 'join-room', roomCode: code });
    } catch {
      setError('Could not reach the game. Is the laptop dev server running?');
      setPhase({ kind: 'idle' });
    }
  }, []);

  const pickPower = useCallback(
    (power: PowerId) => {
      // Stamp the solve-timer at the moment the player commits to a puzzle, so
      // the duration reported on solve includes reading + working it.
      puzzleStartRef.current = Date.now();
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
    // unlockTalent returns the SAME reference when the unlock is invalid, so
    // React bails out and the persist effect doesn't re-fire.
    setTalents((t) => unlockTalent(t, id));
  }, []);

  const onSolved = useCallback(() => {
    // Decide from the CURRENT phase via the render-synced ref — never inside a
    // setState updater (F-22). Every puzzle guards onSolved behind its
    // solvedRef, so a non-'puzzle' phase here is a stray/duplicate call:
    // no cast, no stardust.
    const p = phaseRef.current;
    if (p.kind !== 'puzzle') return;
    // Boost the cast if this power has a strength talent invested (M8).
    const boosted = strengthRef.current.has(p.power);
    // Measured solve duration for the laptop's rhythm portrait (M10). Clamp to
    // ≥0 in case the clock is odd; a missing start (0) yields a sane elapsed.
    // Capped at the puzzle's effective timer (F-50): backgrounding the tab
    // pauses the tick-counted countdown but not this wall-clock, and telemetry
    // must never report a solve longer than the timer allowed.
    const capMs = PUZZLE_TIMER_SECONDS[p.power](tuningRef.current) * 1000;
    const solveMs = Math.min(Math.max(0, Date.now() - puzzleStartRef.current), capMs);
    // send() reports whether the frame reached an OPEN socket (F-07): a
    // solve on a dead link must not fake a "Cast!" or mint stardust —
    // surface the loss instead.
    const sent = clientRef.current?.send({ type: 'puzzle-solved', powerId: p.power, boosted, solveMs }) ?? false;
    if (!sent) {
      setPhase({ kind: 'disconnected', roomCode: p.roomCode });
      return;
    }
    setPhase({ kind: 'cast-feedback', roomCode: p.roomCode, power: p.power });
    // Earn a stardust for the solve; persistence rides the talents effect.
    setTalents((t) => earnStardust(t));
    if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setPhase((prev) =>
        prev.kind === 'cast-feedback' ? { kind: 'spellbook', roomCode: prev.roomCode } : prev
      );
    }, 1200);
  }, []);

  const onCancel = useCallback(() => {
    setPhase((p) => (p.kind === 'puzzle' ? { kind: 'spellbook', roomCode: p.roomCode } : p));
  }, []);

  // Back to fresh code entry from the connection-lost screen (the remembered
  // room may be gone — e.g. the laptop rebooted and minted a new code).
  const reset = useCallback(() => {
    setError(null);
    setPhase({ kind: 'idle' });
  }, []);

  return (
    <div
      style={{
        minHeight: MIN_VIEWPORT_HEIGHT,
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
        reset,
        error,
        talents,
        tuning,
        theme: puzzleTheme,
      })}
      {bonus !== null && <BonusToast amount={bonus} />}
    </div>
  );
}

/** A transient "★ +N — planet cleared" toast pinned to the top of the screen. */
function BonusToast({ amount }: { amount: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a1b3a',
        border: '1px solid #ffd16680',
        color: '#ffd166',
        padding: '12px 18px',
        borderRadius: '12px',
        fontSize: '15px',
        fontWeight: 700,
        boxShadow: '0 4px 16px #0006',
        whiteSpace: 'nowrap',
      }}
    >
      ★ +{amount} — planet cleared!
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
    reset: () => void;
    error: string | null;
    talents: TalentState;
    tuning: PuzzleOverrides;
    theme: PuzzleTheme;
  }
) {
  if (phase.kind === 'idle' || phase.kind === 'connecting') {
    return (
      <div style={{ width: '100%', maxWidth: '320px' }}>
        {actions.error && (
          <div
            style={{
              background: '#1a1b3a',
              border: '1px solid #ff6b9d',
              color: '#ff6b9d',
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
    return PUZZLES[phase.power]({ onSolved: actions.onSolved, onCancel: actions.onCancel, tuning: actions.tuning, theme: actions.theme });
  }
  if (phase.kind === 'disconnected') {
    return (
      <div style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div
          style={{
            background: '#1a1b3a',
            border: '1px solid #ff6b9d',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '22px', color: '#ff6b9d' }}>Connection lost</h1>
          <p style={{ margin: '10px 0 0', fontSize: '14px', opacity: 0.6 }}>
            The link to the laptop dropped. If the game is still running, rejoin with the same code.
          </p>
        </div>
        <button
          onClick={() => actions.handleJoin(phase.roomCode)}
          style={{
            fontSize: '18px',
            padding: '14px 24px',
            minHeight: '48px',
            borderRadius: '12px',
            border: 'none',
            background: '#ffd166',
            color: '#000',
            fontWeight: 700,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Rejoin {phase.roomCode}
        </button>
        <button
          onClick={actions.reset}
          style={{
            fontSize: '15px',
            padding: '12px 24px',
            minHeight: '44px',
            borderRadius: '12px',
            border: '1px solid #334',
            background: '#1a1b3a',
            color: '#fff',
            opacity: 0.8,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Enter a different code
        </button>
      </div>
    );
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
