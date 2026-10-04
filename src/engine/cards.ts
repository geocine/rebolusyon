/**
 * A card is an integer 0..51 encoded as `rank * 4 + suit`.
 * Ranks run 3 (weakest) .. 2 (strongest); suits run ♣ < ♠ < ♥ < ♦ (Filipino order).
 * The encoding means plain numeric comparison equals card strength in normal order.
 */
export type Card = number;

export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const;
export const RANK_NAMES = [
  'Threes', 'Fours', 'Fives', 'Sixes', 'Sevens', 'Eights', 'Nines', 'Tens',
  'Jacks', 'Queens', 'Kings', 'Aces', 'Twos',
] as const;
export const SUITS = ['♣', '♠', '♥', '♦'] as const;
export const SUIT_NAMES = ['Clubs', 'Spades', 'Hearts', 'Diamonds'] as const;

export const THREE_OF_CLUBS: Card = 0;
export const RANK_TWO = 12;
export const RANK_THREE = 0;

export const rankOf = (c: Card) => c >> 2;
export const suitOf = (c: Card) => c & 3;
export const isRedSuit = (s: number) => s >= 2;
export const makeCard = (rank: number, suit: number): Card => rank * 4 + suit;

export const cardLabel = (c: Card) => `${RANKS[rankOf(c)]}${SUITS[suitOf(c)]}`;

/** Strength of a single card under the current order (higher is stronger). */
export const power = (c: Card, revolution: boolean) => (revolution ? 51 - c : c);
export const rankPower = (rank: number, revolution: boolean) => (revolution ? 12 - rank : rank);

export function newDeck(): Card[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

export type Rng = () => number;

/** Small deterministic PRNG so games and tests can be seeded. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type SortMode = 'rank' | 'suit';

export function sortHand(cards: Card[], mode: SortMode, revolution = false): Card[] {
  const a = cards.slice();
  if (mode === 'rank') {
    a.sort((x, y) => power(x, revolution) - power(y, revolution));
  } else {
    a.sort((x, y) => suitOf(x) - suitOf(y) || rankPower(rankOf(x), revolution) - rankPower(rankOf(y), revolution));
  }
  return a;
}

export function removeCards(hand: Card[], cards: Card[]): Card[] {
  const drop = new Set(cards);
  return hand.filter((c) => !drop.has(c));
}

export function containsAll(hand: Card[], cards: Card[]): boolean {
  const have = new Set(hand);
  return cards.every((c) => have.has(c));
}
