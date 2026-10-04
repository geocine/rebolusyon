/**
 * Strength benchmark, skipped by default. Run with:
 *   $env:BENCH=1; npx vitest run src/engine/ai.bench.test.ts
 */
import { describe, expect, it } from 'vitest';
import { mulberry32 } from './cards';
import { type Difficulty, type GameState, DEFAULT_SETTINGS, createMatch, pass, play } from './game';
import { PERSONAS, decide } from './ai';
import { think } from './search';
import { playout, rolloutMove, simFrom } from './sim';

declare const process: { env: Record<string, string | undefined> };

const bench = process.env.BENCH ? describe : describe.skip;
const ROUNDS = Number(process.env.ROUNDS ?? 120);
const BUDGET = Number(process.env.BUDGET ?? 40);

type Bot = (s: GameState, p: number) => ReturnType<typeof decide>['combo'];

function playRound(s: GameState, bots: Bot[]): GameState {
  let g = s;
  for (let i = 0; i < 400 && g.phase === 'playing'; i++) {
    const c = bots[g.turn](g, g.turn);
    g = c ? play(g, g.turn, c.cards) : pass(g, g.turn);
  }
  return g;
}

function tournament(hero: Bot, villain: Bot, rounds: number) {
  let wins = 0;
  let points = 0;
  for (let r = 0; r < rounds; r++) {
    const seat = r % 4;
    const bots = [0, 1, 2, 3].map((p) => (p === seat ? hero : villain));
    const settings = { ...DEFAULT_SETTINGS, buwis: false, rounds: 1 };
    const g = playRound(createMatch(settings, 1000 + Math.floor(r / 4)), bots);
    const res = g.history[g.history.length - 1];
    if (res.winner === seat) wins++;
    points += res.deltas[seat];
  }
  return { winRate: wins / rounds, avgPoints: points / rounds };
}

const heuristic = (d: Difficulty): Bot => {
  const rng = mulberry32(7);
  return (s, p) => decide(s, p, PERSONAS[p], d, rng).combo;
};
const searcher = (d: Difficulty, budgetMs = BUDGET): Bot => {
  const rng = mulberry32(11);
  return (s, p) => think(s, p, d, rng, { budgetMs, style: { winWeight: 0.5, temperature: 0, patience: 1, inference: 1, leaderAim: 0 } }).combo;
};

const rolloutBot = (): Bot => {
  const rng = mulberry32(13);
  const fallback = heuristic('hard');
  return (s, p) => (s.firstPlay ? fallback(s, p) : rolloutMove(simFrom(s, s.hands), rng));
};

bench('AI benchmark', () => {
  it('rollout policy vs heuristic', () => {
    const r = tournament(rolloutBot(), heuristic('hard'), ROUNDS);
    console.log(`rollout policy vs 3× heuristic: win ${(r.winRate * 100).toFixed(1)}%, avg points ${r.avgPoints.toFixed(2)}`);
  }, 600_000);

  it('playout speed', () => {
    const s = createMatch(DEFAULT_SETTINGS, 5);
    const rng = mulberry32(3);
    const t0 = performance.now();
    const n = 2000;
    for (let i = 0; i < n; i++) playout(simFrom(s, s.hands), rng);
    const ms = (performance.now() - t0) / n;
    console.log(`playout: ${(ms * 1000).toFixed(0)}µs each`);
    expect(ms).toBeLessThan(5);
  });

  it('search (hard) vs heuristic (hard)', () => {
    const r = tournament(searcher('hard'), heuristic('hard'), ROUNDS);
    console.log(`search vs 3× heuristic: win ${(r.winRate * 100).toFixed(1)}% (fair share 25%), avg points ${r.avgPoints.toFixed(2)}`);
    expect(r.winRate).toBeGreaterThan(0.25);
  }, 600_000);

  it('in-game levels vs heuristic (hard)', () => {
    for (const d of ['normal', 'hard'] as const) {
      const rng = mulberry32(21);
      const bot: Bot = (s, p) => think(s, p, d, rng).combo;
      const r = tournament(bot, heuristic('hard'), ROUNDS);
      console.log(`${d} (real budget + persona styles) vs 3× old heuristic: win ${(r.winRate * 100).toFixed(1)}%, avg points ${r.avgPoints.toFixed(2)}`);
    }
  }, 1_800_000);

  it('heuristic (hard) vs heuristic (hard) control', () => {
    const r = tournament(heuristic('hard'), heuristic('hard'), ROUNDS);
    console.log(`heuristic vs 3× heuristic: win ${(r.winRate * 100).toFixed(1)}%, avg points ${r.avgPoints.toFixed(2)}`);
  }, 600_000);
});
