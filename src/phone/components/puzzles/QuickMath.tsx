import { useEffect, useMemo, useRef, useState } from 'react';

type Op = '+' | '−' | '×';
interface Problem {
  a: number;
  b: number;
  op: Op;
  answer: number;
}

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function makeProblem(): Problem {
  const op: Op = (['+', '−', '×'] as const)[randInt(0, 2)];
  if (op === '+') {
    const a = randInt(8, 48);
    const b = randInt(8, 48);
    return { a, b, op, answer: a + b };
  }
  if (op === '−') {
    const a = randInt(20, 70);
    const b = randInt(5, a - 1);
    return { a, b, op, answer: a - b };
  }
  const a = randInt(3, 12);
  const b = randInt(3, 12);
  return { a, b, op, answer: a * b };
}

interface Props {
  onSolved: () => void;
  onCancel: () => void;
  totalSeconds?: number;
  problemCount?: number;
}

export function QuickMath({ onSolved, onCancel, totalSeconds = 30, problemCount = 3 }: Props) {
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(input);
    if (!Number.isFinite(value) || input.trim() === '') return;
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
      setWrong(true);
      setInput('');
      setTimeout(() => setWrong(false), 350);
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
        <span style={{ opacity: 0.6 }}>
          Freeze Stars · {idx + 1}/{problems.length}
        </span>
        <span style={{ color: timeColor }}>⏱ {secondsLeft}s</span>
      </div>

      <div style={{ fontSize: '64px', fontWeight: 700, margin: '12px 0', letterSpacing: '4px' }}>
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
