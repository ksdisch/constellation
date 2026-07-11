import { describe, expect, it } from 'vitest';
import { QUESTIONS, ROUND_SIZE, TRIVIA_TIMER_SECONDS, sampleQuestions } from './triviaLogic';

/**
 * Invariants of the Trivia question table and the round sampler (F-55). The
 * Question type constrains shape at compile time; these assertions guard the
 * content invariants the type can't see (distinct options, unique prompts, a
 * pool deep enough to fill a round).
 */

describe('QUESTIONS table', () => {
  it('is deep enough to fill a round', () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(ROUND_SIZE);
  });

  it('every question has a non-empty prompt, four distinct options, and an in-range answer', () => {
    for (const q of QUESTIONS) {
      expect(q.prompt.trim().length).toBeGreaterThan(0);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect([0, 1, 2, 3]).toContain(q.correctIndex);
      expect(q.options[q.correctIndex]).toBeDefined();
    }
  });

  it('prompts are unique across the table', () => {
    expect(new Set(QUESTIONS.map((q) => q.prompt)).size).toBe(QUESTIONS.length);
  });
});

describe('sampleQuestions', () => {
  it('returns count questions with no repeats, all drawn from the pool', () => {
    for (let i = 0; i < 50; i++) {
      const round = sampleQuestions(QUESTIONS, ROUND_SIZE);
      expect(round).toHaveLength(ROUND_SIZE);
      expect(new Set(round).size).toBe(ROUND_SIZE);
      for (const q of round) expect(QUESTIONS).toContain(q);
    }
  });

  it('clamps to the pool size when asked for more than exists', () => {
    const round = sampleQuestions(QUESTIONS, QUESTIONS.length + 10);
    expect(round).toHaveLength(QUESTIONS.length);
    expect(new Set(round).size).toBe(QUESTIONS.length);
  });

  it('returns an empty round for zero or negative counts', () => {
    expect(sampleQuestions(QUESTIONS, 0)).toEqual([]);
    expect(sampleQuestions(QUESTIONS, -1)).toEqual([]);
  });

  it('never mutates the pool', () => {
    const before = QUESTIONS.slice();
    sampleQuestions(QUESTIONS, QUESTIONS.length);
    expect(QUESTIONS).toEqual(before);
  });
});

describe('TRIVIA_TIMER_SECONDS', () => {
  it('pins the default countdown the solveMs telemetry cap relies on (F-50)', () => {
    expect(TRIVIA_TIMER_SECONDS).toBe(30);
  });
});
