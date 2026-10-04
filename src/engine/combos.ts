import { type Card, RANKS, RANK_NAMES, RANK_TWO, SUITS, cardLabel, rankOf, suitOf } from './cards';

export type ComboType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'straight'
  | 'flush'
  | 'fullhouse'
  | 'quads'
  | 'straightflush';

export interface Combo {
  type: ComboType;
  /** Cards sorted ascending (normal order). */
  cards: Card[];
  /** Lexicographic comparison key within the same type. Larger = stronger in normal order. */
  key: number[];
}

/** Five-card hand hierarchy. Rebolusyon never flips this ladder, only comparisons within a type. */
export const FIVE_ORDER: Record<string, number> = {
  straight: 0,
  flush: 1,
  fullhouse: 2,
  quads: 3,
  straightflush: 4,
};

export const COMBO_NAMES: Record<ComboType, string> = {
  single: 'Single',
  pair: 'Pair',
  triple: 'Triple',
  straight: 'Straight',
  flush: 'Flush',
  fullhouse: 'Full House',
  quads: 'Four of a Kind',
  straightflush: 'Straight Flush',
};

const asc = (a: number, b: number) => a - b;

function rankCounts(cards: Card[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of cards) m.set(rankOf(c), (m.get(rankOf(c)) ?? 0) + 1);
  return m;
}

/** Classify a set of cards as a playable combination, or null if it isn't one. */
export function classify(input: Card[]): Combo | null {
  const cards = input.slice().sort(asc);
  const n = cards.length;
  if (new Set(cards).size !== n) return null;

  if (n === 1) return { type: 'single', cards, key: [cards[0]] };

  const sameRank = cards.every((c) => rankOf(c) === rankOf(cards[0]));
  if (n === 2) return sameRank ? { type: 'pair', cards, key: [cards[1]] } : null;
  if (n === 3) return sameRank ? { type: 'triple', cards, key: [rankOf(cards[0])] } : null;
  if (n !== 5) return null;

  const ranks = cards.map(rankOf);
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]));
  const straight =
    new Set(ranks).size === 5 && ranks[4] - ranks[0] === 4 && ranks[4] < RANK_TWO;
  const top = cards[4];

  if (straight && flush) return { type: 'straightflush', cards, key: [top] };

  const counts = [...rankCounts(cards).entries()].sort((a, b) => b[1] - a[1]);
  if (counts[0][1] === 4) return { type: 'quads', cards, key: [counts[0][0]] };
  if (counts[0][1] === 3 && counts[1][1] === 2) return { type: 'fullhouse', cards, key: [counts[0][0]] };
  if (flush) return { type: 'flush', cards, key: [suitOf(top), ...ranks.slice().reverse()] };
  if (straight) return { type: 'straight', cards, key: [top] };
  return null;
}

function compareKeys(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d !== 0) return d;
  }
  return 0;
}

/**
 * Positive when `a` beats `b`. Only combos with the same card count are comparable.
 * Under Rebolusyon, comparisons within the same type are inverted.
 */
export function compareCombos(a: Combo, b: Combo, revolution: boolean): number {
  if (a.cards.length !== b.cards.length) return 0;
  if (a.cards.length === 5 && a.type !== b.type) return FIVE_ORDER[a.type] - FIVE_ORDER[b.type];
  const d = compareKeys(a.key, b.key);
  return revolution ? -d : d;
}

export function beats(a: Combo, b: Combo, revolution: boolean): boolean {
  return a.cards.length === b.cards.length && compareCombos(a, b, revolution) > 0;
}

export function describeCombo(c: Combo): string {
  const r = (x: number) => RANKS[x];
  switch (c.type) {
    case 'single':
      return cardLabel(c.cards[0]);
    case 'pair':
      return `Pair of ${RANK_NAMES[rankOf(c.cards[0])]}`;
    case 'triple':
      return `Three ${RANK_NAMES[rankOf(c.cards[0])]}`;
    case 'straight':
      return `Straight to ${cardLabel(c.cards[4])}`;
    case 'flush':
      return `${SUITS[suitOf(c.cards[0])]} Flush, ${r(rankOf(c.cards[4]))} high`;
    case 'fullhouse':
      return `Full House, ${RANK_NAMES[c.key[0]]}`;
    case 'quads':
      return `Four ${RANK_NAMES[c.key[0]]}`;
    case 'straightflush':
      return `Straight Flush to ${cardLabel(c.cards[4])}`;
  }
}

/* ------------------------------------------------------------------ */
/* Enumeration (used by the AI and the "cycle playable" helper).       */
/* ------------------------------------------------------------------ */

function choose<T>(items: T[], k: number): T[][] {
  const out: T[][] = [];
  const pick: T[] = [];
  const rec = (start: number) => {
    if (pick.length === k) {
      out.push(pick.slice());
      return;
    }
    for (let i = start; i <= items.length - (k - pick.length); i++) {
      pick.push(items[i]);
      rec(i + 1);
      pick.pop();
    }
  };
  rec(0);
  return out;
}

function byRank(hand: Card[]): Card[][] {
  const groups: Card[][] = Array.from({ length: 13 }, () => []);
  for (const c of hand.slice().sort(asc)) groups[rankOf(c)].push(c);
  return groups;
}

function bySuit(hand: Card[]): Card[][] {
  const groups: Card[][] = Array.from({ length: 4 }, () => []);
  for (const c of hand.slice().sort(asc)) groups[suitOf(c)].push(c);
  return groups;
}

/** Five-card combos. Suit choices are pruned to the variants that can matter for beating a table. */
export function enumerateFives(hand: Card[]): Combo[] {
  const out: Combo[] = [];
  const seen = new Set<string>();
  const push = (cards: Card[]) => {
    const combo = classify(cards);
    if (!combo) return;
    const id = combo.cards.join(',');
    if (seen.has(id)) return;
    seen.add(id);
    out.push(combo);
  };

  const ranks = byRank(hand);
  const suits = bySuit(hand);

  // Straights: lowest suit for the lower four ranks, every suit for the top card.
  for (let lo = 0; lo + 4 < RANK_TWO; lo++) {
    const window = ranks.slice(lo, lo + 5);
    if (window.some((g) => g.length === 0)) continue;
    const base = window.slice(0, 4).map((g) => g[0]);
    for (const top of window[4]) push([...base, top]);
  }

  // Straight flushes are found exhaustively per suit.
  for (const s of suits) {
    const rs = new Set(s.map(rankOf));
    for (let lo = 0; lo + 4 < RANK_TWO; lo++) {
      let ok = true;
      for (let r = lo; r < lo + 5; r++) if (!rs.has(r)) ok = false;
      if (ok) push(s.filter((c) => rankOf(c) >= lo && rankOf(c) < lo + 5));
    }
  }

  // Flushes: for each possible top card, pair it with the four lowest beneath it.
  for (const s of suits) {
    if (s.length < 5) continue;
    for (let t = 4; t < s.length; t++) push([...s.slice(0, 4), s[t]]);
    if (s.length <= 7) for (const combo of choose(s, 5)) push(combo);
  }

  // Full houses: any triple with the cheapest pair of another rank.
  for (let tr = 0; tr < 13; tr++) {
    if (ranks[tr].length < 3) continue;
    for (const triple of choose(ranks[tr], 3)) {
      for (let pr = 0; pr < 13; pr++) {
        if (pr === tr || ranks[pr].length < 2) continue;
        push([...triple, ...ranks[pr].slice(0, 2)]);
      }
    }
  }

  // Quads: every kicker option, since the kicker choice shapes the rest of the hand.
  for (let q = 0; q < 13; q++) {
    if (ranks[q].length !== 4) continue;
    for (const k of hand) if (rankOf(k) !== q) push([...ranks[q], k]);
  }

  return out;
}

export function enumerateCombos(hand: Card[], size?: number): Combo[] {
  const out: Combo[] = [];
  const ranks = byRank(hand);
  if (!size || size === 1) for (const c of hand) out.push({ type: 'single', cards: [c], key: [c] });
  if (!size || size === 2)
    for (const g of ranks) if (g.length >= 2) for (const p of choose(g, 2)) out.push(classify(p)!);
  if (!size || size === 3)
    for (const g of ranks) if (g.length >= 3) for (const t of choose(g, 3)) out.push(classify(t)!);
  if (!size || size === 5) out.push(...enumerateFives(hand));
  return out;
}

export const isPowerRank = (rank: number, revolution: boolean) => (revolution ? rank === 0 : rank === RANK_TWO);
