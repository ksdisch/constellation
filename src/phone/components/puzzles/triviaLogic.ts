/**
 * Pure Trivia round logic (F-55) — the question table and the no-repeat round
 * sampler, framework-free so they're Vitest-testable. The component
 * (`Trivia.tsx`) renders them; nothing here imports React or touches the DOM.
 */

export type Question = {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

export const QUESTIONS: Question[] = [
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

/** Questions per round. */
export const ROUND_SIZE = 3;

/**
 * Default countdown length. The component uses it as its `timerSeconds`
 * default; App.tsx imports it to cap the reported `solveMs` at what the timer
 * actually allowed (F-50).
 */
export const TRIVIA_TIMER_SECONDS = 30;

/** Sample up to `count` distinct questions — no repeats within a round. */
export function sampleQuestions(pool: readonly Question[], count: number): Question[] {
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
