import { type Card, type Rng, power, rankOf, shuffle } from './cards';
import { type Combo, beats, classify } from './combos';
import { type Fact, type GameState, PLAYERS } from './game';
import { unseenCards } from './ai';

const visibleTo = (f: Fact, me: number) => !('knownTo' in f) || !f.knownTo || f.knownTo.includes(me);

/** True when this hand (known exactly) contradicts a hard "couldn't beat it" fact. */
function contradicts(hand: Card[], f: Extract<Fact, { kind: 'noBeat' }>): boolean {
  const n = f.top.cards.length;
  if (n === 1) return hand.some((c) => power(c, f.rev) > power(f.top.cards[0], f.rev));
  if (n === 5) {
    if (hand.length !== 5) return false;
    const combo = classify(hand);
    return !!combo && beats(combo, f.top, f.rev);
  }
  const byRank = new Map<number, Card[]>();
  for (const c of hand) byRank.set(rankOf(c), [...(byRank.get(rankOf(c)) ?? []), c]);
  for (const group of byRank.values()) {
    if (group.length < n) continue;
    group.sort((a, b) => a - b);
    // Strongest n-card set of this rank: highest suits normally, lowest suits under Rebolusyon.
    const pick = f.rev ? group.slice(0, n) : group.slice(-n);
    const combo: Combo = classify(pick)!;
    if (beats(combo, f.top, f.rev)) return true;
  }
  return false;
}

export interface BeliefOptions {
  /** Fraction of played cards remembered (0..1). */
  memory: number;
  /** How much passing is read as weakness (0 = ignore, 1 = strong read). */
  inference: number;
}

/**
 * One plausible deal of the hidden cards, consistent with what `me` remembers and has deduced.
 * Own hand is exact; opponents get hands of the right size.
 */
export function sampleWorld(s: GameState, me: number, opts: BeliefOptions, rng: Rng): Card[][] {
  const facts = s.facts.filter((f) => f.player !== me && visibleTo(f, me));
  const played = new Set(s.played);
  const hands: Card[][] = Array.from({ length: PLAYERS }, (_, p) => (p === me ? s.hands[me].slice() : []));

  const pinned = new Set<Card>();
  for (const f of facts) {
    if (f.kind !== 'holds' || played.has(f.card) || s.hands[me].includes(f.card)) continue;
    if (hands[f.player].length < s.hands[f.player].length) {
      hands[f.player].push(f.card);
      pinned.add(f.card);
    }
  }

  const need = s.hands.map((h, p) => (p === me ? 0 : h.length - hands[p].length));
  const total = need.reduce((a, b) => a + b, 0);
  // With imperfect memory the pool holds "forgotten" played cards too; keep a random subset.
  const pool = shuffle(
    unseenCards(s, me, opts.memory).filter((c) => !pinned.has(c)),
    rng,
  ).slice(0, total);

  const weight = (p: number, c: Card): number => {
    let w = 1;
    for (const f of facts) {
      if (f.player !== p) continue;
      if (f.kind === 'maxSingle') {
        if (c !== f.except && power(c, f.rev) > power(f.card, f.rev)) return 0;
      } else if (f.kind === 'noBeat' && f.top.cards.length === 1 && power(c, f.rev) > power(f.top.cards[0], f.rev)) {
        if (f.hard) return 0;
        // A pass is weak evidence: people sit on their Twos on purpose.
        w *= 1 - 0.45 * opts.inference;
      }
    }
    return w;
  };

  const hardFacts = facts.filter((f): f is Extract<Fact, { kind: 'noBeat' }> => f.kind === 'noBeat' && f.hard);
  let best: Card[][] | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const out = hands.map((h) => h.slice());
    const left = need.slice();
    // Place the most constrained cards first so they still find a legal home.
    const ws = pool.map((c) => ({ c, w: [0, 1, 2, 3].map((p) => (p === me ? 0 : weight(p, c))) }));
    ws.sort((a, b) => a.w.filter((x) => x > 0).length - b.w.filter((x) => x > 0).length);
    for (const { c, w } of ws) {
      let sum = 0;
      for (let p = 0; p < PLAYERS; p++) if (left[p] > 0) sum += w[p];
      let pick = -1;
      if (sum > 0) {
        let r = rng() * sum;
        for (let p = 0; p < PLAYERS; p++) {
          if (left[p] <= 0 || w[p] === 0) continue;
          r -= w[p];
          if (r <= 0) {
            pick = p;
            break;
          }
        }
        for (let p = PLAYERS - 1; pick < 0 && p >= 0; p--) if (left[p] > 0 && w[p] > 0) pick = p;
      } else {
        const open = [0, 1, 2, 3].filter((p) => left[p] > 0);
        pick = open[Math.floor(rng() * open.length)];
      }
      out[pick].push(c);
      left[pick]--;
    }
    best = out;
    if (!hardFacts.some((f) => contradicts(out[f.player], f))) break;
  }
  return best!;
}
