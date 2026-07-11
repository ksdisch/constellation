import { useEffect, useMemo, useRef, useState } from 'react';
import type { PuzzleTheme } from '../../../shared/protocol';
import { paletteFor } from '../../puzzleThemes';
import { QUICK_MATH_TOTAL_SECONDS, makeProblem } from './quickMathLogic';

interface Props {
  onSolved: () => void;
  onCancel: () => void;
  totalSeconds?: number;
  problemCount?: number;
  theme?: PuzzleTheme;
}

export function QuickMath({ onSolved, onCancel, totalSeconds = QUICK_MATH_TOTAL_SECONDS, problemCount = 3, theme }: Props) {
  const pal = paletteFor(theme);
  const problems = useMemo(
    () => Array.from({ length: problemCount }, makeProblem),
    [problemCount]
  );
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [wrong, setWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const solvedRef = useRef(false);
  // The wrong-flash reset is tracked so rapid submits re-arm cleanly and a
  // pending flash is dropped on unmount (F-48).
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (wrongTimerRef.current !== null) clearTimeout(wrongTimerRef.current);
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [idx]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  useEffect(() => {
    if (secondsLeft <= 0 && !solvedRef.current) {
      onCancel();
    }
  }, [secondsLeft, onCancel]);

  const current = problems[idx];
  if (!current) return null;

  function flashWrong() {
    setWrong(true);
    setInput('');
    if (wrongTimerRef.current !== null) clearTimeout(wrongTimerRef.current);
    wrongTimerRef.current = setTimeout(() => setWrong(false), 350);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Late/duplicate submits are no-ops once solved or timed out (F-49).
    if (solvedRef.current || secondsLeft <= 0) return;
    const value = Number(input);
    if (input.trim() === '' || !Number.isFinite(value)) {
      // Unparsable input gets the wrong-flash instead of a silent no-op (F-53).
      flashWrong();
      return;
    }
    if (value === current.answer) {
      if (idx === problems.length - 1) {
        solvedRef.current = true;
        onSolved();
      } else {
        setIdx(idx + 1);
        setInput('');
        setWrong(false);
      }
    } else {
      flashWrong();
    }
  }

  const timeColor = secondsLeft <= 5 ? '#ff9090' : '#a8b0d8';

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
          {pal.glyph && `${pal.glyph} `}Freeze Stars · {idx + 1}/{problems.length}
        </span>
        <span style={{ color: timeColor }}>⏱ {secondsLeft}s</span>
      </div>

      <div style={{ fontSize: '64px', fontWeight: 700, margin: '12px 0', letterSpacing: '4px', color: pal.glyph ? pal.glow : undefined }}>
        {current.a} {current.op} {current.b}
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="="
          style={{
            fontSize: '40px',
            padding: '18px',
            borderRadius: '12px',
            border: wrong ? '2px solid #ff6b9d' : '1px solid #334',
            background: '#1a1b3a',
            color: '#fff',
            textAlign: 'center',
            boxSizing: 'border-box',
            transition: 'border 150ms',
          }}
        />
        <button
          type="submit"
          disabled={input.trim() === ''}
          style={{
            fontSize: '18px',
            padding: '14px',
            borderRadius: '12px',
            border: 'none',
            background: input.trim() === '' ? '#334' : '#7ad8ff',
            color: input.trim() === '' ? '#667' : '#001a2a',
            fontWeight: 700,
            cursor: input.trim() === '' ? 'not-allowed' : 'pointer',
          }}
        >
          Submit
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            fontSize: '14px',
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            color: '#667',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
