import { useEffect, useRef, useState } from 'react';
import type { PuzzleTheme } from '../../../shared/protocol';
import { paletteFor } from '../../puzzleThemes';
import { QUESTIONS, ROUND_SIZE, TRIVIA_TIMER_SECONDS, sampleQuestions, type Question } from './triviaLogic';

export type { Question } from './triviaLogic';

const ACCENT = '#f6c971';
const WRONG_FLASH_MS = 600;

interface Props {
  onSolved: () => void;
  onCancel: () => void;
  questionPool?: readonly Question[];
  timerSeconds?: number;
  /** Talent "Second Chance": a wrong answer no longer resets to question 1. */
  forgiveMistakes?: boolean;
  theme?: PuzzleTheme;
}

export function Trivia({
  onSolved,
  onCancel,
  questionPool = QUESTIONS,
  timerSeconds = TRIVIA_TIMER_SECONDS,
  forgiveMistakes = false,
  theme,
}: Props) {
  const pal = paletteFor(theme);
  const [round, setRound] = useState<Question[]>(() => sampleQuestions(questionPool, ROUND_SIZE));
  const [idx, setIdx] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(timerSeconds);
  const solvedRef = useRef(false);

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

  function onPick(optionIdx: number) {
    if (wrong || solvedRef.current || secondsLeft <= 0) return;
    const current = round[idx];
    if (!current) return;
    if (optionIdx === current.correctIndex) {
      if (idx === round.length - 1) {
        solvedRef.current = true;
        onSolved();
      } else {
        setIdx(idx + 1);
      }
    } else {
      setWrong(true);
      setTimeout(() => {
        // "Second Chance" talent: stay on the current question instead of
        // resetting the whole round back to question 1.
        if (!forgiveMistakes) {
          setRound(sampleQuestions(questionPool, ROUND_SIZE));
          setIdx(0);
        }
        setWrong(false);
      }, WRONG_FLASH_MS);
    }
  }

  const current = round[idx];
  if (!current) return null;

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
          {pal.glyph && `${pal.glyph} `}Illuminate · {idx + 1}/{round.length}
        </span>
        <span style={{ color: timeColor }}>⏱ {secondsLeft}s</span>
      </div>

      <div
        style={{
          width: '100%',
          minHeight: '96px',
          padding: '20px',
          borderRadius: '14px',
          background: '#1a1b3a',
          border: `1px solid ${pal.glyph ? pal.glow : `${ACCENT}40`}`,
          fontSize: '20px',
          lineHeight: 1.35,
          textAlign: 'center',
          color: '#fff',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {current.prompt}
      </div>

      {wrong && (
        <div
          style={{
            color: '#ff6b9d',
            fontSize: '15px',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          Try again!
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
        }}
      >
        {current.options.map((option, i) => (
          <button
            key={i}
            type="button"
            disabled={wrong || solvedRef.current}
            onClick={() => onPick(i)}
            style={{
              minHeight: '52px',
              padding: '14px 18px',
              fontSize: '17px',
              borderRadius: '12px',
              border: `1px solid ${ACCENT}60`,
              background: wrong ? '#2a1b2a' : '#1a1b3a',
              color: '#fff',
              textAlign: 'left',
              cursor: wrong ? 'not-allowed' : 'pointer',
              transition: 'background 120ms, transform 80ms, border 120ms',
              opacity: wrong ? 0.6 : 1,
            }}
            onPointerDown={(e) => {
              if (!wrong) e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onPointerUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onPointerLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            <span style={{ color: ACCENT, fontWeight: 700, marginRight: '10px' }}>
              {String.fromCharCode(65 + i)}
            </span>
            {option}
          </button>
        ))}
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
          color: '#667',
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>
    </div>
  );
}
