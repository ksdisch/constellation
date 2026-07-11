import { TALENTS, type TalentNode, type TalentKind, type TalentId } from '../talents/talents';
import { canUnlock, type TalentState } from '../talents/save';

/**
 * The talent constellation screen. Shows the player's unspent stardust and the
 * eight talent stars grouped by puzzle. Tapping an available star unlocks it;
 * the parent owns persistence (App.tsx). Inline styles only, palette-matched,
 * ≥44px touch targets — per project conventions.
 */

interface Props {
  state: TalentState;
  onUnlock: (id: TalentId) => void;
  onBack: () => void;
}

// Per-puzzle accent, matching the Spellbook tiles.
const ACCENT: Record<TalentNode['power'], string> = {
  'freeze-stars': '#7ad8ff',
  'summon-platform': '#9a7aff',
  'illuminate': '#f6c971',
  'phase-dash': '#5eead4',
};

const BRANCH_LABEL: Record<TalentNode['power'], string> = {
  'freeze-stars': 'Freeze Stars',
  'summon-platform': 'Summon Platform',
  'illuminate': 'Illuminate',
  'phase-dash': 'Phase Dash',
};

// Stable branch order = the four powers, in TALENTS order.
const BRANCHES = Array.from(new Set(TALENTS.map((t) => t.power)));

export function TalentTree({ state, onUnlock, onBack }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        maxWidth: '360px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '14px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            opacity: 0.6,
          }}
        >
          Constellation
        </h2>
        <span style={{ fontSize: '16px', color: '#ffd166', fontWeight: 700 }}>
          ★ {state.stardust}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '13px', opacity: 0.6, lineHeight: 1.4 }}>
        Solve puzzles to earn stardust, then spend it to make your puzzles cozier.
      </p>

      {BRANCHES.map((power) => {
        const nodes = TALENTS.filter((t) => t.power === power);
        const accent = ACCENT[power];
        return (
          <div key={power} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span
              style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                color: accent,
                opacity: 0.85,
              }}
            >
              {BRANCH_LABEL[power]}
            </span>
            {nodes.map((node) => (
              <TalentStar
                key={node.id}
                node={node}
                accent={accent}
                owned={state.unlocked.includes(node.id)}
                affordable={canUnlock(state, node.id)}
                onUnlock={() => onUnlock(node.id)}
              />
            ))}
          </div>
        );
      })}

      <button
        type="button"
        onClick={onBack}
        style={{
          marginTop: '4px',
          minHeight: '44px',
          fontSize: '14px',
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid #334',
          background: 'transparent',
          color: '#a8b0d8',
          cursor: 'pointer',
        }}
      >
        ← Back to spellbook
      </button>
    </div>
  );
}

interface StarProps {
  node: TalentNode;
  accent: string;
  owned: boolean;
  affordable: boolean;
  onUnlock: () => void;
}

function TalentStar({ node, accent, owned, affordable, onUnlock }: StarProps) {
  // Three visual states: owned (lit), affordable (tappable), locked (dimmed).
  const interactive = !owned && affordable;
  const bg = owned ? `${accent}1f` : '#1a1b3a';
  const border = owned ? accent : interactive ? `${accent}80` : '#2a2c4d';
  const opacity = owned || interactive ? 1 : 0.45;

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onUnlock}
      style={{
        textAlign: 'left',
        minHeight: '44px',
        padding: '14px 16px',
        borderRadius: '14px',
        border: `1px solid ${border}`,
        background: bg,
        color: '#fff',
        cursor: interactive ? 'pointer' : 'default',
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'transform 80ms, background 120ms, border 120ms',
        boxShadow: owned ? `0 0 12px ${accent}44` : 'none',
      }}
      onPointerDown={(e) => {
        if (interactive) e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span style={{ fontSize: '20px', color: owned ? accent : '#fff', opacity: owned ? 1 : 0.6, lineHeight: 1 }}>
        {owned ? '★' : '☆'}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: owned ? accent : '#fff' }}>
            {node.title}
          </span>
          <KindTag kind={node.kind} accent={accent} />
        </span>
        <span style={{ fontSize: '12px', opacity: 0.7 }}>{node.blurb}</span>
      </span>
      <span
        style={{
          fontSize: '13px',
          fontWeight: 700,
          color: owned ? accent : interactive ? '#ffd166' : '#fff',
          opacity: owned || interactive ? 1 : 0.6,
          whiteSpace: 'nowrap',
        }}
      >
        {owned ? 'Owned' : `★ ${node.cost}`}
      </span>
    </button>
  );
}

/**
 * Tiny pill that names the talent's flavor — the self-vs-partner asymmetry at a
 * glance. Accommodation tunes YOUR puzzle; strength boosts your PARTNER's power.
 */
function KindTag({ kind, accent }: { kind: TalentKind; accent: string }) {
  const strength = kind === 'strength';
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: '6px',
        whiteSpace: 'nowrap',
        color: strength ? '#1a1b3a' : accent,
        background: strength ? accent : 'transparent',
        border: `1px solid ${accent}${strength ? '' : '66'}`,
      }}
    >
      {strength ? 'For partner' : 'For you'}
    </span>
  );
}
