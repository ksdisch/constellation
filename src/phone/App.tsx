import { useState, useRef, useCallback } from 'react';
import { RoomJoin } from './components/RoomJoin';
import { Spellbook } from './components/Spellbook';
import { QuickMath } from './components/puzzles/QuickMath';
import { PhoneNetClient } from './net/client';
import type { PowerId } from '../shared/protocol';

type Phase =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'spellbook'; roomCode: string }
  | { kind: 'puzzle'; roomCode: string; power: PowerId }
  | { kind: 'cast-feedback'; roomCode: string; power: PowerId };

export function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const clientRef = useRef<PhoneNetClient | null>(null);

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

  const onSolved = useCallback(() => {
    setPhase((p) => {
      if (p.kind !== 'puzzle') return p;
      clientRef.current?.send({ type: 'puzzle-solved', powerId: p.power });
      return { kind: 'cast-feedback', roomCode: p.roomCode, power: p.power };
    });
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
      {renderPhase(phase, { handleJoin, pickPower, onSolved, onCancel, error })}
    </div>
  );
}

function renderPhase(
  phase: Phase,
  actions: {
    handleJoin: (code: string) => void;
    pickPower: (id: PowerId) => void;
    onSolved: () => void;
    onCancel: () => void;
    error: string | null;
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
        <Spellbook onPick={actions.pickPower} />
      </div>
    );
  }
  if (phase.kind === 'puzzle') {
    return <QuickMath onSolved={actions.onSolved} onCancel={actions.onCancel} />;
  }
  // cast-feedback
  return (
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '36px', color: '#7ad8ff', margin: 0 }}>Cast!</h1>
      <p style={{ opacity: 0.6, marginTop: '8px' }}>Freeze Stars — enemies cold for 3s.</p>
    </div>
  );
}
