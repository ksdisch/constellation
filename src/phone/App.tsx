import { useCallback, useRef, useState } from 'react';
import { RoomJoin } from './components/RoomJoin';
import { PhoneNetClient } from './net/client';

type Phase =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'joined'; roomCode: string };

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
        setPhase({ kind: 'joined', roomCode: msg.roomCode });
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
      {phase.kind === 'joined' ? (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', color: '#98ffc8', margin: 0 }}>Connected</h1>
          <p style={{ opacity: 0.6, marginTop: '8px' }}>
            Room {phase.roomCode} — powers coming in M2.
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '320px' }}>
          {error && (
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
              {error}
            </div>
          )}
          <RoomJoin onJoin={handleJoin} busy={phase.kind === 'connecting'} />
        </div>
      )}
    </div>
  );
}
