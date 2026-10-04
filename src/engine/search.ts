/**
 * Determinized Monte Carlo search (Perfect Information Monte Carlo, as used for Bridge and Skat):
 * sample hidden hands that fit what the bot knows, play each candidate move out with a fast
 * policy, and keep the move with the best average outcome. Candidates come from the heuristic
 * in ai.ts, which on its own is a strong Big Two baseline; search fixes its blind spots.
 */
import { type Rng, mulberry32 } from './cards';
import type { Combo } from './combos';
import { type Difficulty, type GameState, HUMAN, flipsOrder, isLeading } from './game';
import { type Persona, type Style, decide, personaAt } from './ai';
import { sampleWorld } from './belief';
import { playout, simFrom, simPass, simPlay } from './sim';

interface Level {
  /** Share of moves played on Chill instincts instead of searching. */
  slop: number;
  budgetMs: number;
  maxWorlds: number;
  candidates: number;
  memoryScale: number;
  inference: number;
  temperature: number;
}

const LEVELS: Record<Exclude<Difficulty, 'easy'>, Level> = {
  normal: { slop: 0.15, budgetMs: 50, maxWorlds: 30, candidates: 3, memoryScale: 0.6, inference: 0.3, temperature: 0.3 },
  hard: { slop: 0, budgetMs: 300, maxWorlds: 360, candidates: 6, memoryScale: 1, inference: 1, temperature: 0.03 },
  rival: { slop: 0, budgetMs: 300, maxWorlds: 360, candidates: 6, memoryScale: 1, inference: 1, temperature: 0.03 },
};

/** Rival plays at full strength unless the human trails; then it gets sloppier in proportion to the gap. */
function levelFor(s: GameState, me: number, difficulty: Exclude<Difficulty, 'easy'>): Level {
  const level = LEVELS[difficulty];
  if (difficulty !== 'rival' || me === HUMAN) return level;
  const gap = Math.max(...s.scores) - s.scores[HUMAN];
  return { ...level, slop: 0.85 * Math.min(1, Math.max(0, (gap - 4) / 36)) };
}

export interface CandidateStat {
  combo: Combo | null;
  mean: number;
  win: number;
  points: number;
  n: number;
}

export interface Thought {
  combo: Combo | null;
  /** Estimated chance this seat wins the round after the chosen move (null = heuristic only). */
  winProb: number | null;
  /** Estimated points for this seat this round. */
  points: number | null;
  candidates: CandidateStat[];
  worlds: number;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Weights turning a round's deltas into one number this seat wants to maximize. */
function utilityFor(s: GameState, me: number, style: Style, difficulty: Difficulty) {
  const others = [0, 1, 2, 3].filter((p) => p !== me);
  const leader = others.reduce((a, b) => (s.scores[b] > s.scores[a] ? b : a));
  const aim = s.scores[leader] > s.scores[me] && s.scores[leader] > 0 ? style.leaderAim : 0;

  // Rival: when the human leads, every bot also plays against the human's points.
  let humanW = 0;
  if (difficulty === 'rival' && me !== HUMAN) {
    const lead = s.scores[HUMAN] - Math.max(...others.filter((p) => p !== HUMAN).map((p) => s.scores[p]), s.scores[me]);
    if (lead > 4) humanW = -Math.min(0.6, lead / 40);
  }
  // Place points (±3) are far smaller than card penalties, so weigh them up to keep 2nd vs 3rd worth fighting for.
  const unit = s.settings.playOut ? 2.5 : 10;
  return (d: number[], winner: number) => {
    let u = d[me] / unit + (winner === me ? style.winWeight : 0);
    if (aim) u -= (aim * d[leader]) / unit;
    if (humanW) u += (humanW * d[HUMAN]) / unit;
    return u;
  };
}

export function think(
  s: GameState,
  me: number,
  difficulty: Difficulty,
  rng: Rng,
  opts: { persona?: Persona; style?: Style; budgetMs?: number } = {},
): Thought {
  const persona = opts.persona ?? personaAt(s, me);
  const heuristic = decide(s, me, persona, difficulty, rng, difficulty === 'easy' ? 1 : 0.15);
  if (difficulty === 'easy') {
    return { combo: heuristic.combo, winProb: null, points: null, candidates: [], worlds: 0 };
  }

  const level = levelFor(s, me, difficulty);
  if (me !== HUMAN && level.slop > 0 && rng() < level.slop) {
    const instinct = decide(s, me, persona, 'easy', rng);
    return { combo: instinct.combo, winProb: null, points: null, candidates: [], worlds: 0 };
  }
  const style = opts.style ?? persona.style;
  const hand = s.hands[me];

  const finisher = heuristic.scores.find((x) => x.combo && x.combo.cards.length === hand.length);
  if (finisher) return { combo: finisher.combo, winProb: 1, points: null, candidates: [], worlds: 0 };

  const cands: (Combo | null)[] = [];
  for (const x of heuristic.scores) {
    if (x.combo && cands.filter(Boolean).length < level.candidates) cands.push(x.combo);
  }
  if (!isLeading(s)) cands.push(null);
  if (cands.length === 1) return { combo: cands[0], winProb: null, points: null, candidates: [], worlds: 0 };

  const utility = utilityFor(s, me, style, difficulty);
  const stats = cands.map((combo) => ({ combo, sum: 0, win: 0, points: 0, n: 0 }));
  const flipBonus = (c: Combo | null) => (c && flipsOrder(s, me, c) ? 0.15 * persona.revLove : 0);

  const belief = { memory: Math.min(1, persona.memory * level.memoryScale), inference: level.inference * style.inference };
  const budget = (opts.budgetMs ?? level.budgetMs) * style.patience;
  const start = now();
  let worlds = 0;
  while (worlds < level.maxWorlds && (worlds < 12 || now() - start < budget)) {
    const hands = sampleWorld(s, me, belief, rng);
    const seed = Math.floor(rng() * 2 ** 31);
    for (const st of stats) {
      const sim = simFrom(s, hands);
      if (st.combo) simPlay(sim, st.combo);
      else simPass(sim);
      const d = playout(sim, mulberry32(seed));
      st.sum += utility(d, sim.winner);
      st.win += sim.winner === me ? 1 : 0;
      st.points += d[me];
      st.n++;
    }
    worlds++;
  }

  const candidates: CandidateStat[] = stats.map((st) => ({
    combo: st.combo,
    mean: st.sum / st.n + flipBonus(st.combo),
    win: st.win / st.n,
    points: st.points / st.n,
    n: st.n,
  }));

  // Softmax over values: strong bots rarely pick a bad move, but they aren't a lookup table.
  const temp = level.temperature * style.temperature;
  let chosen = candidates[0];
  if (temp <= 0) {
    for (const c of candidates) if (c.mean > chosen.mean) chosen = c;
  } else {
    const top = Math.max(...candidates.map((c) => c.mean));
    const w = candidates.map((c) => Math.exp((c.mean - top) / temp));
    let r = rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < candidates.length; i++) {
      r -= w[i];
      if (r <= 0) {
        chosen = candidates[i];
        break;
      }
    }
  }

  candidates.sort((a, b) => b.mean - a.mean);
  return {
    combo: chosen.combo,
    winProb: chosen.win,
    points: chosen.points,
    candidates,
    worlds,
  };
}
