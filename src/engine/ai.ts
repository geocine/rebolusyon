import { type Card, type Rng, RANK_TWO, newDeck, power, rankOf, rankPower, removeCards } from './cards';
import { type Combo, FIVE_ORDER, enumerateFives } from './combos';
import { type Difficulty, type GameState, PLAYERS, flipsOrder, isLeading, legalPlays, nextSeat } from './game';

export interface Persona {
  name: string;
  title: string;
  color: string;
  initials: string;
  /** Reluctance to spend strong cards early (0..1). */
  hoard: number;
  /** Fraction of played cards remembered at Hard difficulty (0..1). */
  memory: number;
  /** Bonus appetite for triggering Rebolusyon. */
  revLove: number;
  /** Randomness in decisions. */
  chaos: number;
  blurb: string;
}

export const PERSONAS: Persona[] = [
  {
    name: 'You',
    title: 'The Challenger',
    color: '#f3e9d8',
    initials: 'YOU',
    hoard: 0.6,
    memory: 1,
    revLove: 0.5,
    chaos: 0,
    blurb: 'You.',
  },
  {
    name: 'Lola Nena',
    title: 'The Patient Matriarch',
    color: '#93b38c',
    initials: 'LN',
    hoard: 1,
    memory: 0.95,
    revLove: 0.15,
    chaos: 0.3,
    blurb: 'Everyone’s lola (grandma). Sits on her Twos like heirlooms, remembers every card since 1974, and hates getting caught with a full hand.',
  },
  {
    name: 'Kuya Jun',
    title: 'The Jeepney King',
    color: '#cf6a3f',
    initials: 'KJ',
    hoard: 0.2,
    memory: 0.55,
    revLove: 1,
    chaos: 0.9,
    blurb: 'Every friend group’s kuya (big brother). Plays loud, plays fast, swings for the win, and flips the table the moment he gets four of anything.',
  },
  {
    name: 'Mika',
    title: 'The Counter',
    color: '#d4a24c',
    initials: 'MK',
    hoard: 0.55,
    memory: 1,
    revLove: 0.5,
    chaos: 0.15,
    blurb: 'Quiet. Tracks the deck and reads every pass. Knows exactly when your Two is the last one.',
  },
];

const DIFFICULTY = {
  easy: { memoryScale: 0.25, noise: 9, lookahead: false },
  normal: { memoryScale: 0.75, noise: 2.5, lookahead: true },
  hard: { memoryScale: 1, noise: 0.6, lookahead: true },
  rival: { memoryScale: 1, noise: 0.6, lookahead: true },
} satisfies Record<Difficulty, { memoryScale: number; noise: number; lookahead: boolean }>;

/** Deterministic 0..1 hash so an AI "forgets" the same cards consistently. */
function hash01(a: number, b: number, c: number): number {
  let h = Math.imul(a + 1, 0x9e3779b1) ^ Math.imul(b + 7, 0x85ebca6b) ^ Math.imul(c + 13, 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

/** Cards this player believes are still in opponents' hands. */
export function unseenCards(s: GameState, player: number, memory: number): Card[] {
  const mine = new Set(s.hands[player]);
  const onTable = new Set(s.trick.done ? [] : s.trick.plays.flatMap((p) => p.combo?.cards ?? []));
  const remembered = new Set(
    s.played.filter((c) => onTable.has(c) || hash01(c, s.round, player) < memory),
  );
  return newDeck().filter((c) => !mine.has(c) && !remembered.has(c));
}

interface Thresholds {
  rev: boolean;
  single: number;
  pair: number;
  triple: number;
}

function thresholds(unseen: Card[], rev: boolean): Thresholds {
  const byRank: Card[][] = Array.from({ length: 13 }, () => []);
  for (const c of unseen) byRank[rankOf(c)].push(c);
  let single = -1;
  let pair = -1;
  let triple = -1;
  for (const c of unseen) single = Math.max(single, power(c, rev));
  byRank.forEach((g, r) => {
    if (g.length >= 2) {
      g.sort((a, b) => a - b);
      // Pair key is its higher card; under Rebolusyon the strongest pair uses the two lowest suits.
      const key = rev ? g[1] : g[g.length - 1];
      pair = Math.max(pair, power(key, rev));
    }
    if (g.length >= 3) triple = Math.max(triple, rankPower(r, rev));
  });
  return { rev, single, pair, triple };
}

/** 0..1 rough strength of a combo within its own type. */
export function unitStrength(c: Combo, rev: boolean): number {
  switch (c.type) {
    case 'single':
      return power(c.key[0], rev) / 51;
    case 'pair':
      return power(c.key[0], rev) / 51;
    case 'triple':
      return rankPower(c.key[0], rev) / 12;
    default:
      return 0.5 + FIVE_ORDER[c.type] * 0.1;
  }
}

function isBoss(c: Combo, t: Thresholds): boolean {
  switch (c.type) {
    case 'single':
      return power(c.key[0], t.rev) > t.single;
    case 'pair':
      return power(c.key[0], t.rev) > t.pair;
    case 'triple':
      return rankPower(c.key[0], t.rev) > t.triple;
    default:
      return FIVE_ORDER[c.type] >= FIVE_ORDER.fullhouse;
  }
}

function unitCost(c: Combo, t: Thresholds): number {
  return isBoss(c, t) ? 0.35 : 1 + 0.8 * (1 - unitStrength(c, t.rev));
}

function restUnits(hand: Card[]): Combo[] {
  const byRank: Card[][] = Array.from({ length: 13 }, () => []);
  for (const c of hand) byRank[rankOf(c)].push(c);
  const units: Combo[] = [];
  for (const g of byRank) {
    g.sort((a, b) => a - b);
    if (g.length === 4) {
      units.push({ type: 'pair', cards: g.slice(0, 2), key: [g[1]] });
      units.push({ type: 'pair', cards: g.slice(2), key: [g[3]] });
    } else if (g.length === 3) units.push({ type: 'triple', cards: g, key: [rankOf(g[0])] });
    else if (g.length === 2) units.push({ type: 'pair', cards: g, key: [g[1]] });
    else if (g.length === 1) units.push({ type: 'single', cards: g, key: [g[0]] });
  }
  return units;
}

export interface Plan {
  cost: number;
  units: Combo[];
}

/** Best partition of a hand into playable units (lower cost = easier to shed). */
export function bestPlan(hand: Card[], t: Thresholds, memo = new Map<string, Plan>()): Plan {
  const id = hand.slice().sort((a, b) => a - b).join(',');
  const hit = memo.get(id);
  if (hit) return hit;

  const rest = restUnits(hand);
  let best: Plan = { cost: rest.reduce((a, u) => a + unitCost(u, t), 0), units: rest };
  if (hand.length >= 5) {
    for (const f of enumerateFives(hand)) {
      const sub = bestPlan(removeCards(hand, f.cards), t, memo);
      const cost = unitCost(f, t) + sub.cost;
      if (cost < best.cost) best = { cost, units: [f, ...sub.units] };
    }
  }
  memo.set(id, best);
  return best;
}

function dangerOf(cards: number): number {
  return cards <= 1 ? 1 : cards === 2 ? 0.75 : cards === 3 ? 0.5 : cards === 4 ? 0.25 : 0;
}

function gaussian(rng: Rng): number {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface Decision {
  /** null = pass */
  combo: Combo | null;
  scores: { combo: Combo | null; score: number }[];
}

export function decide(
  s: GameState,
  player: number,
  persona: Persona,
  difficulty: Difficulty,
  rng: Rng,
  noiseScale = 1,
): Decision {
  const base = DIFFICULTY[difficulty];
  const cfg = { ...base, noise: base.noise * noiseScale };
  const hand = s.hands[player];
  const rev = s.revolution;
  const leading = isLeading(s);
  const unseen = unseenCards(s, player, persona.memory * cfg.memoryScale);
  const tNow = thresholds(unseen, rev);
  const tFlip = thresholds(unseen, !rev);
  const memoNow = new Map<string, Plan>();
  const memoFlip = new Map<string, Plan>();

  const opps = [0, 1, 2, 3].filter((p) => p !== player);
  const danger = Math.max(...opps.map((p) => dangerOf(s.hands[p].length)));
  const nextCards = s.hands[nextSeat(player)].length;
  const topBy = s.trick.topBy;
  const topDanger = !leading && topBy !== player ? dangerOf(s.hands[topBy].length) : 0;

  const options = legalPlays(s, player);
  const scored: { combo: Combo | null; score: number }[] = [];

  for (const combo of options) {
    const after = removeCards(hand, combo.cards);
    if (after.length === 0) {
      scored.push({ combo, score: 1e6 });
      continue;
    }
    const flips = flipsOrder(s, player, combo);
    const t = flips ? tFlip : tNow;
    const plan = bestPlan(after, t, flips ? memoFlip : memoNow);
    const strength = unitStrength(combo, rev);
    const boss = isBoss(combo, tNow);

    let score = -plan.cost * 10 + combo.cards.length * 0.8;

    if (leading) {
      score -= strength * 4 * (1 - danger);
      // Leading into someone who can finish on this exact size is a gift unless we're unbeatable.
      for (const p of opps) {
        if (s.hands[p].length === combo.cards.length && !boss) score -= 14 * (p === nextSeat(player) ? 1.3 : 1);
      }
      if (combo.type === 'single' && nextCards === 1 && !boss) score -= 20;
    } else {
      const lateGame = Math.min(1, hand.length / 10);
      score -= strength * strength * 7 * persona.hoard * lateGame * (1 - Math.max(danger, topDanger));
      score += 10 * topDanger + (boss ? 6 * danger : 0);
    }

    if (cfg.lookahead && boss && plan.units.length === 1) score += 40;
    if (cfg.lookahead && plan.units.length === 1 && isBoss(plan.units[0], t)) score += 25;

    if (flips) score += persona.revLove * 5;

    score += gaussian(rng) * cfg.noise * (0.4 + persona.chaos);
    scored.push({ combo, score });
  }

  if (!leading) {
    const plan = bestPlan(hand, tNow, memoNow);
    let score = -plan.cost * 10 + 1.5 * persona.hoard;
    score -= 30 * topDanger;
    score += gaussian(rng) * cfg.noise * 0.5;
    scored.push({ combo: null, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return { combo: scored[0]?.combo ?? null, scores: scored };
}

/** Winner of a round picks which card to send back to the tribute payer. */
export function chooseTributeReturn(s: GameState, player: number): Card {
  const hand = s.hands[player];
  const t = thresholds(newDeck().filter((c) => !hand.includes(c)), false);
  const memo = new Map<string, Plan>();
  let best = hand[0];
  let bestCost = Infinity;
  for (const c of hand) {
    if (rankOf(c) === RANK_TWO) continue;
    const cost = bestPlan(removeCards(hand, [c]), t, memo).cost + c / 520;
    if (cost < bestCost) {
      bestCost = cost;
      best = c;
    }
  }
  return best;
}

export const opponentsOf = (player: number) => Array.from({ length: PLAYERS }, (_, p) => p).filter((p) => p !== player);
