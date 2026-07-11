import { useEffect, useRef, useState } from 'react';
import type { PuzzleTheme } from '../../../shared/protocol';
import { paletteFor } from '../../puzzleThemes';
import { PHASE_ALIGN_TOTAL_SECONDS, randomMisaligned } from './phaseAlignLogic';

/**
 * Phase Align — the Phase Dash puzzle.
 *
 * A small grid of phase dials, each rotated to a random NON-aligned angle. Tap a
 * dial to rotate it +90°; align every dial to "up" (0°) to cast. A spatial
 * alignment puzzle — a distinct interaction class from arithmetic (QuickMath),
 * memory (TapSequence), and knowledge (Trivia). Cozy, no twitch: the challenge
 * is tracking the dials under the timer, not reaction speed.
 *
 * Contract: `{ onSolved, onCancel }` plus optional difficulty props with
 * defaults (see QuickMath for the template). On timeout it cancels, matching the
 * other three puzzles.
 */

interface Props {
  onSolved: () => void;
  onCancel: () => void;
  totalSeconds?: number;
  dialCount?: number;
  theme?: PuzzleTheme;
}

const ACCENT = '#5eead4';

export function PhaseAlign({ onSolved, onCancel, totalSeconds = PHASE_ALIGN_TOTAL_SECONDS, dialCount = 4, theme }: Props) {
  const pal = paletteFor(theme);
  const [dials, setDials] = useState<number[]>(() =>
    Array.from({ length: dialCount }, randomMisaligned)
  );
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const solvedRef = useRef(false);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft <= 0 && !solvedRef.current) onCancel();
  }, [secondsLeft, onCancel]);

  // Win detection lives in an effect (not the tap handler) so onSolved fires as
  // a clean side effect of state, never mid-update. Initial state is always
  // misaligned, so this cannot fire on mount.
  useEffect(() => {
    if (!solvedRef.current && dials.length > 0 && dials.every((r) => r === 0)) {
      solvedRef.current = true;
      onSolved();
    }
  }, [dials, onSolved]);

  function rotate(i: number) {
    if (solvedRef.current || secondsLeft <= 0) return;
    setDials((prev) => {
      const next = prev.slice();
      next[i] = (next[i] + 90) % 360;
      return next;
    });
  }

  const alignedCount = dials.filter((r) => r === 0).length;
  const timeColor = secondsLeft <= 5 ? '#ff6b9d' : '#a8b0d8';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        alignItems: 'center',
        width: '100%',
        maxWidth: '360px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '14px',
        }}
      >
        <span style={{ opacity: 0.6, color: pal.glyph ? pal.accent : undefined }}>
          {pal.glyph && `${pal.glyph} `}Phase Align · {alignedCount}/{dials.length} aligned
        </span>
        <span aria-live={secondsLeft <= 5 ? 'polite' : 'off'} style={{ color: timeColor }}>⏱ {secondsLeft}s</span>
      </div>

      <p style={{ margin: 0, fontSize: '13px', opacity: 0.6, textAlign: 'center', color: pal.glyph ? pal.glow : undefined }}>
        Tap each dial until every arrow points up.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          width: '100%',
          maxWidth: '300px',
        }}
      >
        {dials.map((rotation, i) => {
          const aligned = rotation === 0;
          return (
            <button
              key={i}
              onClick={() => rotate(i)}
              aria-label={`phase dial ${i + 1}`}
              style={{
                aspectRatio: '1 / 1',
                minHeight: '88px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '18px',
                border: `2px solid ${aligned ? ACCENT : `${ACCENT}40`}`,
                background: aligned ? `${ACCENT}1f` : '#1a1b3a',
                cursor: 'pointer',
                outline: 'none',
                padding: 0,
                transition: 'background 120ms, border 120ms',
                boxShadow: aligned ? `0 0 14px ${ACCENT}55` : 'none',
              }}
            >
              <span
                style={{
                  fontSize: '40px',
                  lineHeight: 1,
                  color: aligned ? ACCENT : '#fff',
                  opacity: aligned ? 1 : 0.75,
                  transform: `rotate(${rotation}deg)`,
                  transition: 'transform 150ms ease-out, color 120ms',
                }}
              >
                ▲
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onCancel}
        style={{
          fontSize: '14px',
          padding: '10px 20px',
          minHeight: '44px',
          borderRadius: '8px',
          border: 'none',
          background: 'transparent',
          color: '#fff',
          opacity: 0.6,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
}
