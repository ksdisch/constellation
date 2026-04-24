import type { PowerId } from '../../shared/protocol';

interface Power {
  id: PowerId;
  label: string;
  subtitle: string;
  accent: string;
}

const POWERS: Power[] = [
  {
    id: 'freeze-stars',
    label: 'Freeze Stars',
    subtitle: 'Quick Math — 3 problems in 30s',
    accent: '#7ad8ff',
  },
];

interface Props {
  onPick: (id: PowerId) => void;
}

export function Spellbook({ onPick }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '360px',
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: '14px',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          opacity: 0.6,
          textAlign: 'center',
        }}
      >
        Spellbook
      </h2>
      {POWERS.map((p) => (
        <button
          key={p.id}
          onClick={() => onPick(p.id)}
          style={{
            textAlign: 'left',
            padding: '20px',
            borderRadius: '16px',
            border: `1px solid ${p.accent}40`,
            background: '#1a1b3a',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            transition: 'transform 80ms, background 120ms',
          }}
          onPointerDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ fontSize: '20px', fontWeight: 700, color: p.accent }}>{p.label}</span>
          <span style={{ fontSize: '13px', opacity: 0.7 }}>{p.subtitle}</span>
        </button>
      ))}
      <p style={{ fontSize: '12px', opacity: 0.4, textAlign: 'center', marginTop: '12px' }}>
        More powers arrive in M3.
      </p>
    </div>
  );
}
