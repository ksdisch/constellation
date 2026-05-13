import { useEffect, useRef, useState } from 'react';

export type Question = {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

const QUESTIONS: Question[] = [
  {
    prompt: 'How many planets are in our solar system?',
    options: ['7', '8', '9', '10'],
    correctIndex: 1,
  },
  {
    prompt: 'Which planet is known as the Red Planet?',
    options: ['Venus', 'Jupiter', 'Mars', 'Saturn'],
    correctIndex: 2,
  },
  {
    prompt: 'What is the largest ocean on Earth?',
    options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'],
    correctIndex: 3,
  },
  {
    prompt: 'How many legs does a spider have?',
    options: ['6', '8', '10', '12'],
    correctIndex: 1,
  },
  {
    prompt: 'What is the chemical symbol for gold?',
    options: ['Go', 'Gd', 'Au', 'Ag'],
    correctIndex: 2,
  },
  {
    prompt: 'How many sides does a hexagon have?',
    options: ['5', '6', '7', '8'],
    correctIndex: 1,
  },
  {
    prompt: 'How many strings does a standard guitar have?',
    options: ['4', '5', '6', '7'],
    correctIndex: 2,
  },
  {
    prompt: 'How many players from one team are on a soccer field at once?',
    options: ['9', '10', '11', '12'],
    correctIndex: 2,
  },
  {
    prompt: 'What is the tallest mountain on Earth?',
    options: ['K2', 'Everest', 'Denali', 'Kilimanjaro'],
    correctIndex: 1,
  },
  {
    prompt: 'What gas do plants absorb from the air?',
    options: ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'],
    correctIndex: 2,
  },
  {
    prompt: 'Which animal is the largest mammal on Earth?',
    options: ['African elephant', 'Blue whale', 'Giraffe', 'Great white shark'],
    correctIndex: 1,
  },
  {
    prompt: 'How many continents are there?',
    options: ['5', '6', '7', '8'],
    correctIndex: 2,
  },
];

const ACCENT = '#f6c971';
const WRONG_FLASH_MS = 600;
const ROUND_SIZE = 3;

function sampleQuestions(pool: readonly Question[], count: number): Question[] {
  const copy = pool.slice();
  const out: Question[] = [];
  const take = Math.min(count, copy.length);
  for (let i = 0; i < take; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return out;
}

interface Props {
  onSolved: () => void;
  onCancel: () => void;
  questionPool?: readonly Question[];
  timerSeconds?: number;
}

export function Trivia({
  onSolved,
  onCancel,
  questionPool = QUESTIONS,
  timerSeconds = 30,
}: Props) {
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
        setRound(sampleQuestions(questionPool, ROUND_SIZE));
        setIdx(0);
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
        <span style={{ opacity: 0.6 }}>
          Illuminate · {idx + 1}/{round.length}
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
          border: `1px solid ${ACCENT}40`,
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
