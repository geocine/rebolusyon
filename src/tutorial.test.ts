import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type GameState, HUMAN, play, returnTribute, validatePlay } from './engine/game';
import { LESSONS, type Lesson, tutorBotMove } from './tutorial';

/** Plays a lesson the way the host asks, advancing steps exactly like the app does. */
function walk(lesson: Lesson) {
  let g: GameState = lesson.setup(DEFAULT_SETTINGS);
  const cursor = [0, 0, 0, 0];
  let step = 0;
  let rejected: string | null = null;
  const moves = lesson.solution.slice();
  const advance = () => {
    while (step < lesson.steps.length && lesson.steps[step].until?.(g, { rejected })) {
      step++;
      rejected = null;
    }
  };
  for (let guard = 0; guard < 200 && step < lesson.steps.length; guard++) {
    advance();
    if (step >= lesson.steps.length) break;
    if (g.phase === 'playing' && g.turn !== HUMAN && !lesson.frozen) {
      g = tutorBotMove(g, g.turn, lesson, cursor);
      continue;
    }
    const move = moves.shift();
    if (!move) throw new Error(`${lesson.id}: stuck on step ${step}`);
    if ('tap' in move) {
      expect(lesson.steps[step].until).toBeUndefined();
      step++;
    } else if ('try' in move) {
      const v = validatePlay(g, HUMAN, move.try);
      expect(v.ok).toBe(false);
      if (!v.ok) rejected = v.reason;
    } else if ('give' in move) {
      g = returnTribute(g, move.give);
    } else {
      expect(validatePlay(g, HUMAN, move.play)).toMatchObject({ ok: true });
      g = play(g, HUMAN, move.play);
    }
  }
  return { g, step, left: moves.length };
}

describe('walkthrough lessons', () => {
  for (const lesson of LESSONS) {
    it(`${lesson.id} can be cleared by following the host`, () => {
      const { g, step, left } = walk(lesson);
      expect(step).toBe(lesson.steps.length);
      expect(left).toBe(0);
      const last = g.history[g.history.length - 1];
      if (last) expect(last.winner).toBe(HUMAN);
    });
  }

  it('deals every card at most once', () => {
    for (const lesson of LESSONS) {
      const all = lesson.setup(DEFAULT_SETTINGS).hands.flat();
      expect(new Set(all).size, lesson.id).toBe(all.length);
    }
  });

  it('pays out a Grand Finish in the scoring lesson', () => {
    const { g } = walk(LESSONS.find((l) => l.id === 'bill')!);
    const r = g.history[g.history.length - 1];
    expect(r.grandFinish).toBe(true);
    expect(r.deltas[HUMAN]).toBe(116);
  });
});
