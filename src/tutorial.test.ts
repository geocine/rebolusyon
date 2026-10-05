import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type GameState, HUMAN, PLACE_POINTS, pass, play, returnTribute, validatePlay } from './engine/game';
import { COURSES, type Lesson, loadTutorial, tutorBotMove } from './tutorial';

const ALL = Object.values(COURSES).flat();

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
    } else if ('pass' in move) {
      g = pass(g, HUMAN);
    } else {
      expect(validatePlay(g, HUMAN, move.play)).toMatchObject({ ok: true });
      g = play(g, HUMAN, move.play);
    }
  }
  return { g, step, left: moves.length };
}

describe('walkthrough lessons', () => {
  for (const lesson of ALL) {
    it(`${lesson.id} can be cleared by following the host`, () => {
      const { g, step, left } = walk(lesson);
      expect(step).toBe(lesson.steps.length);
      expect(left).toBe(0);
      const last = g.history[g.history.length - 1];
      if (last) expect(last.winner).toBe(HUMAN);
    });
  }

  it('gives every lesson a unique id, so progress is tracked per lesson', () => {
    expect(new Set(ALL.map((l) => l.id)).size).toBe(ALL.length);
  });

  it('deals every card at most once', () => {
    for (const lesson of ALL) {
      const all = lesson.setup(DEFAULT_SETTINGS).hands.flat();
      expect(new Set(all).size, lesson.id).toBe(all.length);
    }
  });

  it('teaches each course under its own rules', () => {
    for (const lesson of COURSES.klasiko) expect(lesson.setup(DEFAULT_SETTINGS).settings, lesson.id).toMatchObject({ mode: 'klasiko', revolution: false, bantay: false });
    for (const lesson of COURSES.rebolusyon) expect(lesson.setup(DEFAULT_SETTINGS).settings, lesson.id).toMatchObject({ mode: 'rebolusyon', revolution: true });
  });

  it('plays the Klasiko scoring lesson out to all four places', () => {
    const { g } = walk(COURSES.klasiko.find((l) => l.id === 'playout')!);
    const r = g.history[g.history.length - 1];
    expect(r.places).toEqual([HUMAN, 1, 3, 2]);
    expect(r.deltas).toEqual([PLACE_POINTS[0], PLACE_POINTS[1], PLACE_POINTS[3], PLACE_POINTS[2]]);
  });

  it('pays out a Grand Finish in the Rebolusyon scoring lesson', () => {
    const { g } = walk(COURSES.rebolusyon.find((l) => l.id === 'bill')!);
    const r = g.history[g.history.length - 1];
    expect(r.grandFinish).toBe(true);
    expect(r.deltas[HUMAN]).toBe(116);
  });
});

describe('walkthrough progress', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('carries an old Rebolusyon graduation over to the per-course list', () => {
    const saved = JSON.stringify({ cleared: ['basics'], graduated: true });
    vi.stubGlobal('localStorage', { getItem: () => saved });
    expect(loadTutorial()).toEqual({ cleared: ['basics'], graduated: ['rebolusyon'] });
  });
});
