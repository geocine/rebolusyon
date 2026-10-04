/**
 * A stripped-down copy of the round rules for fast playouts. No logs, events or validation:
 * it trusts the rollout policy to only pick legal moves.
 */
import { type Card, type Rng, RANK_TWO, power, rankOf, rankPower, suitOf } from './cards';
import { type Combo, beats, classify } from './combos';
import { type GameState, PLACE_POINTS, PLAYERS, isLeading, penaltyFor, roundMultipliers, underdogSeat } from './game';

export interface Sim {
  hands: Card[][];
  turn: number;
  /** null while someone is leading a fresh trick. */
  top: Combo | null;
  topBy: number;
  passes: number;
  passed: boolean[];
  rev: boolean;
  revolutionRule: boolean;
  bantay: boolean;
  strict: boolean;
  /** Keep going after the first finish; score by place. */
  playOut: boolean;
  finished: number[];
  over: boolean;
  /** First seat to go out. */
  winner: number;
  grand: boolean;
  /** Patong and Huling Hirit penalty factor per seat. */
  stakes: number[];
  /** Alsa: this seat's Three of a Kind also flips the order (-1 when nobody qualifies). */
  underdog: number;
  /** Cached shedding plans per player; dropped whenever they stop matching the hand. */
  plans: (Combo[] | null)[];
}

export function simFrom(s: GameState, hands: Card[][]): Sim {
  const leading = isLeading(s);
  return {
    hands: hands.map((h) => h.slice()),
    turn: s.turn,
    top: leading ? null : s.trick.top,
    topBy: s.trick.topBy,
    passes: leading ? 0 : s.trick.passesSinceTop,
    passed: leading ? [false, false, false, false] : s.trick.passed.slice(),
    rev: s.revolution,
    revolutionRule: s.settings.revolution,
    bantay: s.settings.bantay,
    strict: s.settings.strictPass,
    playOut: s.settings.playOut,
    finished: s.finished.slice(),
    over: false,
    winner: s.finished.length ? s.finished[0] : -1,
    grand: false,
    stakes: [0, 1, 2, 3].map((p) => roundMultipliers(s, p).reduce((a, m) => a * m.factor, 1)),
    underdog: underdogSeat(s),
    plans: [null, null, null, null],
  };
}

function nextActive(sim: Sim, from: number): number {
  for (let i = 1; i <= PLAYERS; i++) {
    const p = (from + i) % PLAYERS;
    if (sim.hands[p].length && (!sim.strict || !sim.passed[p])) return p;
  }
  return from;
}

function nextInPlay(sim: Sim, from: number): number {
  for (let i = 1; i < PLAYERS; i++) {
    const p = (from + i) % PLAYERS;
    if (sim.hands[p].length) return p;
  }
  return from;
}

const othersPassed = (sim: Sim, player: number) => sim.passed.every((x, p) => p === player || x || !sim.hands[p].length);
const contenders = (sim: Sim) => sim.hands.reduce((n, h, p) => n + (p !== sim.topBy && h.length ? 1 : 0), 0);
const clearLeader = (sim: Sim) => (sim.hands[sim.topBy].length ? sim.topBy : nextInPlay(sim, sim.topBy));

export function simPlay(sim: Sim, combo: Combo): void {
  const p = sim.turn;
  const drop = new Set(combo.cards);
  sim.hands[p] = sim.hands[p].filter((c) => !drop.has(c));
  const plan = sim.plans[p];
  if (plan) {
    const i = plan.indexOf(combo);
    if (i >= 0) plan.splice(i, 1);
    else sim.plans[p] = null;
  }
  if (sim.revolutionRule && (combo.type === 'quads' || (combo.type === 'triple' && p === sim.underdog))) {
    sim.rev = !sim.rev;
    sim.plans = [null, null, null, null];
  }
  if (sim.top === null) sim.passed = [false, false, false, false];
  sim.top = combo;
  sim.topBy = p;
  sim.passes = 0;
  if (sim.hands[p].length === 0) {
    if (sim.winner < 0) {
      sim.winner = p;
      sim.grand = combo.type === 'quads' || combo.type === 'straightflush';
    }
    if (!sim.playOut) {
      sim.over = true;
      return;
    }
    sim.finished.push(p);
    const left = sim.hands.findIndex((h) => h.length > 0);
    if (sim.finished.length === PLAYERS - 1) {
      sim.finished.push(left);
      sim.over = true;
      return;
    }
  }
  if (sim.strict && othersPassed(sim, p)) {
    sim.top = null;
    sim.turn = clearLeader(sim);
  } else sim.turn = nextActive(sim, p);
}

export function simPass(sim: Sim): void {
  const p = sim.turn;
  sim.passed[p] = true;
  sim.passes++;
  const done = sim.strict ? othersPassed(sim, sim.topBy) : sim.passes >= contenders(sim);
  if (done) {
    sim.top = null;
    sim.turn = clearLeader(sim);
  } else sim.turn = nextActive(sim, p);
}

/* ------------------------------------------------------------------ */
/* Quick planner: greedy hand partition, O(hand) instead of a search.  */
/* ------------------------------------------------------------------ */

function strengthOf(c: Combo, rev: boolean): number {
  switch (c.type) {
    case 'single':
    case 'pair':
      return power(c.key[0], rev) / 51;
    case 'triple':
      return rankPower(c.key[0], rev) / 12;
    default:
      return 0.6;
  }
}

export function quickPlan(hand: Card[], rev: boolean, revolutionRule: boolean): Combo[] {
  const byRank: Card[][] = Array.from({ length: 13 }, () => []);
  for (const c of hand) byRank[rankOf(c)].push(c);
  for (const g of byRank) g.sort((a, b) => a - b);
  const units: Combo[] = [];
  const weakFirst = (a: Card, b: Card) => power(a, rev) - power(b, rev);

  // Straights that soak up lone cards without splitting pairs.
  for (let round = 0; round < 2; round++) {
    let bestLo = -1;
    let bestScore = 2;
    for (let lo = 0; lo + 4 < RANK_TWO; lo++) {
      let score = 0;
      let ok = true;
      for (let r = lo; r < lo + 5; r++) {
        const n = byRank[r].length;
        if (n === 0 || n === 2 || n === 4) ok = false;
        else if (n === 1) score++;
      }
      if (ok && score > bestScore) {
        bestScore = score;
        bestLo = lo;
      }
    }
    if (bestLo < 0) break;
    const cards: Card[] = [];
    for (let r = bestLo; r < bestLo + 5; r++) cards.push(byRank[r].shift()!);
    units.push(classify(cards)!);
  }

  // Quads with the weakest lone card as kicker. With Rebolusyon on, high quads stay as two pairs.
  for (let r = 0; r < 13; r++) {
    if (byRank[r].length !== 4) continue;
    if (revolutionRule && rankPower(r, rev) > 6) continue;
    let kick = -1;
    for (let k = 0; k < 13; k++) {
      if (k !== r && byRank[k].length === 1 && (kick < 0 || weakFirst(byRank[k][0], byRank[kick][0]) < 0)) kick = k;
    }
    if (kick < 0) continue;
    units.push(classify([...byRank[r], byRank[kick][0]])!);
    byRank[r] = [];
    byRank[kick] = [];
  }

  // Flush out of lone cards of one suit.
  const loneBySuit: Card[][] = [[], [], [], []];
  for (const g of byRank) if (g.length === 1) loneBySuit[suitOf(g[0])].push(g[0]);
  for (const suit of loneBySuit) {
    if (suit.length < 5) continue;
    const cards = suit.sort(weakFirst).slice(0, 5);
    const combo = classify(cards);
    if (!combo) continue;
    units.push(combo);
    for (const c of cards) byRank[rankOf(c)] = [];
  }

  // Full houses: triple plus the weakest pair.
  for (let r = 0; r < 13; r++) {
    if (byRank[r].length !== 3) continue;
    let pr = -1;
    for (let k = 0; k < 13; k++) {
      if (k === r || byRank[k].length !== 2) continue;
      if (pr < 0 || rankPower(k, rev) < rankPower(pr, rev)) pr = k;
    }
    if (pr < 0) continue;
    units.push(classify([...byRank[r], ...byRank[pr]])!);
    byRank[r] = [];
    byRank[pr] = [];
  }

  for (const g of byRank) {
    if (g.length === 4) {
      units.push(classify(g.slice(0, 2))!, classify(g.slice(2))!);
    } else if (g.length >= 1 && g.length <= 3) units.push(classify(g)!);
  }
  return units;
}

function planOf(sim: Sim, p: number): Combo[] {
  let plan = sim.plans[p];
  if (!plan) {
    plan = quickPlan(sim.hands[p], sim.rev, sim.revolutionRule);
    sim.plans[p] = plan;
  }
  return plan;
}

function strongestCard(hand: Card[], rev: boolean): Card {
  let best = hand[0];
  for (const c of hand) if (power(c, rev) > power(best, rev)) best = c;
  return best;
}

const single = (c: Card): Combo => ({ type: 'single', cards: [c], key: [c] });

/* ------------------------------------------------------------------ */
/* Rollout policy                                                      */
/* ------------------------------------------------------------------ */

/** Lead preferences. Tuned by benchmark; the policy is flat across reasonable values. */
const LEAD = { pair: 1.4, triple: 2, five: 3, strength: 2.2, sizeClash: 3 };

/** Fast, sensible move for whoever's turn it is. null = pass. */
export function rolloutMove(sim: Sim, rng: Rng): Combo | null {
  const p = sim.turn;
  const hand = sim.hands[p];
  const plan = planOf(sim, p);
  const next = nextInPlay(sim, p);
  const guard = sim.bantay && sim.hands[next].length === 1;
  const minOpp = Math.min(...sim.hands.map((h, q) => (q === p || !h.length ? 99 : h.length)));

  if (sim.top === null) {
    if (plan.length === 1) {
      const only = plan[0];
      if (!(guard && only.type === 'single' && only.cards[0] !== strongestCard(hand, sim.rev))) return only;
    }
    // Lead the cheapest unit, saving the strongest for the end.
    let strongest = plan[0];
    for (const u of plan) if (strengthOf(u, sim.rev) > strengthOf(strongest, sim.rev)) strongest = u;
    let best: Combo | null = null;
    let bestScore = -Infinity;
    for (const u of plan) {
      if (u === strongest && plan.length > 1) continue;
      const n = u.cards.length;
      let score =
        (n === 5 ? LEAD.five : n === 3 ? LEAD.triple : n === 2 ? LEAD.pair : 0) -
        strengthOf(u, sim.rev) * LEAD.strength +
        rng() * 0.6;
      if (sim.hands.some((h, q) => q !== p && h.length === n)) score -= LEAD.sizeClash;
      if (guard && n === 1) score -= 4;
      if (score > bestScore) {
        bestScore = score;
        best = u;
      }
    }
    best ??= strongest;
    if (guard && best.type === 'single') return single(strongestCard(hand, sim.rev));
    return best;
  }

  const top = sim.top;
  const size = top.cards.length;
  if (guard && size === 1) {
    const s = strongestCard(hand, sim.rev);
    const c = single(s);
    return beats(c, top, sim.rev) ? c : null;
  }

  let pick: Combo | null = null;
  for (const u of plan) {
    if (u.cards.length !== size || !beats(u, top, sim.rev)) continue;
    if (!pick || strengthOf(u, sim.rev) < strengthOf(pick, sim.rev)) pick = u;
  }
  const topLeft = sim.hands[sim.topBy].length;
  const urgent = (topLeft > 0 && topLeft <= 3) || minOpp <= 2 || hand.length <= 4;

  if (pick) {
    // Sit on boss cards early unless someone is about to go out.
    const s = strengthOf(pick, sim.rev);
    const isStrongest = plan.every((u) => strengthOf(u, sim.rev) <= s);
    if (isStrongest && !urgent && hand.length > 6 && plan.length > 2 && rng() < 0.55) return null;
    return pick;
  }
  if (!urgent || size === 5) return null;

  // Break a unit to stop someone who is close to going out.
  if (size === 1) {
    let best: Card | null = null;
    for (const c of hand) {
      if (power(c, sim.rev) > power(top.cards[0], sim.rev) && (best === null || power(c, sim.rev) < power(best, sim.rev))) best = c;
    }
    return best === null ? null : single(best);
  }
  const byRank = new Map<number, Card[]>();
  for (const c of hand) byRank.set(rankOf(c), [...(byRank.get(rankOf(c)) ?? []), c]);
  let best: Combo | null = null;
  for (const g of byRank.values()) {
    if (g.length < size) continue;
    g.sort((a, b) => a - b);
    for (let i = 0; i + size <= g.length; i++) {
      const combo = classify(g.slice(i, i + size));
      if (combo && beats(combo, top, sim.rev) && (!best || strengthOf(combo, sim.rev) < strengthOf(best, sim.rev))) best = combo;
    }
  }
  return best;
}

/** Play the round out. Returns score deltas for every seat. */
export function playout(sim: Sim, rng: Rng, maxSteps = 400): number[] {
  for (let step = 0; step < maxSteps && !sim.over; step++) {
    const move = rolloutMove(sim, rng);
    if (move) simPlay(sim, move);
    else if (sim.top === null) simPlay(sim, single(sim.hands[sim.turn][0]));
    else simPass(sim);
  }
  return deltasOf(sim);
}

export function deltasOf(sim: Sim): number[] {
  if (sim.playOut) {
    // Unfinished playouts rank whoever is left by hand size, the usual tiebreak in practice.
    const rest = [0, 1, 2, 3].filter((p) => !sim.finished.includes(p)).sort((a, b) => sim.hands[a].length - sim.hands[b].length);
    const d = [0, 0, 0, 0];
    [...sim.finished, ...rest].forEach((p, i) => (d[p] = PLACE_POINTS[i]));
    return d;
  }
  if (sim.winner < 0) {
    // Ran out of steps: score it by hand size, which is what usually decides it.
    return sim.hands.map((h) => -h.length);
  }
  const pens = sim.hands.map((h, p) => (p === sim.winner ? 0 : penaltyFor(h, sim.grand).penalty * sim.stakes[p]));
  const total = pens.reduce((a, b) => a + b, 0);
  return pens.map((x, p) => (p === sim.winner ? total : -x));
}
