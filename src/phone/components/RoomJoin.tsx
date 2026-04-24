import { useState } from 'react';

interface Props {
  onJoin: (code: string) => void;
  busy?: boolean;
}

export function RoomJoin({ onJoin, busy = false }: Props) {
  const [code, setCode] = useState('');
  const canSubmit = code.trim().length === 6 && !busy;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onJoin(code.trim().toUpperCase());
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '32px' }}>Constellation</h1>
      <p style={{ margin: 0, opacity: 0.7, textAlign: 'center' }}>
        Enter the 6-letter room code shown on the laptop.
      </p>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase())}
        maxLength={6}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="ABCDEF"
        disabled={busy}
        style={{
          fontSize: '32px',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid #334',
          background: '#1a1b3a',
          color: '#fff',
          width: '100%',
          textAlign: 'center',
          letterSpacing: '8px',
          boxSizing: 'border-box',
          opacity: busy ? 0.6 : 1,
        }}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        style={{
          fontSize: '18px',
          padding: '14px 24px',
          borderRadius: '12px',
          border: 'none',
          background: canSubmit ? '#ffd166' : '#334',
          color: canSubmit ? '#000' : '#667',
          fontWeight: 700,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          width: '100%',
          transition: 'background 150ms',
        }}
      >
        {busy ? 'Connecting…' : 'Join'}
      </button>
    </form>
  );
}
