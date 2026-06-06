import type { PowerId } from '../../shared/protocol';

interface PowerTile {
  label: string;
  subtitle: string;
  accent: string;
}

type Power = { id: PowerId } & PowerTile;

// Keyed by PowerId so every power MUST have a tile — a missing one is a COMPILE
// error (the same exhaustiveness guarantee as App.tsx's puzzle router). Object
// insertion order is the menu order.
const POWER_TILES: Record<PowerId, PowerTile> = {
  'freeze-stars': { label: 'Freeze Stars', subtitle: 'Quick Math — 3 problems in 30s', accent: '#7ad8ff' },
  'summon-platform': { label: 'Summon Platform', subtitle: 'Tap Sequence — repeat 5 lights', accent: '#9a7aff' },
  'illuminate': { label: 'Illuminate', subtitle: 'Trivia — 3 questions in 30s', accent: '#f6c971' },
  'phase-dash': { label: 'Phase Dash', subtitle: 'Phase Align — line up the dials', accent: '#5eead4' },
};

const POWERS: Power[] = (Object.keys(POWER_TILES) as PowerId[]).map((id) => ({ id, ...POWER_TILES[id] }));

interface Props {
  onPick: (id: PowerId) => void;
  onOpenTalents: () => void;
  stardust: number;
}

export function Spellbook({ onPick, onOpenTalents, stardust }: Props) {
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

      <button
        onClick={onOpenTalents}
        style={{
          marginTop: '4px',
          minHeight: '44px',
          padding: '14px 18px',
          borderRadius: '14px',
          border: '1px solid #ffd16640',
          background: 'transparent',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#ffd166' }}>✦ Constellation</span>
        <span style={{ fontSize: '14px', color: '#ffd166', opacity: 0.85 }}>★ {stardust}</span>
      </button>
    </div>
  );
}
