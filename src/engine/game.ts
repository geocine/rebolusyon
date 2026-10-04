import {
  type Card,
  RANK_TWO,
  THREE_OF_CLUBS,
  containsAll,
  mulberry32,
  newDeck,
  power,
  rankOf,
  removeCards,
  shuffle,
} from './cards';
import { type Combo, beats, classify, enumerateCombos } from './combos';

export const PLAYERS = 4;
export const HUMAN = 0;

export type Difficulty = 'easy' | 'normal' | 'hard' | 'rival';
export type Speed = 'chill' | 'normal' | 'fast';

export interface Settings {
  /** Four of a Kind flips the order of every comparison within a combo type. */
  revolution: boolean;
  /** If the next player has one card left, a single you play must be your strongest. */
  bantay: boolean;
  /** Between rounds, the biggest loser hands their best card to the winner, who returns one. */
  buwis: boolean;
  /** Last round's winner pays double if someone else wins this round. */
  bagsak: boolean;
  /** Once you pass, you're out until the trick clears. */
  strictPass: boolean;
  /** Alaala mode: no card tracker; cleared tricks go face-down. Pure memory. */
  memoryMode: boolean;
  difficulty: Difficulty;
  rounds: number;
  speed: Speed;
  sound: boolean;
  haptics: boolean;
  /** When nothing in your hand beats the table, pass for you after a short countdown. */
  autoPass: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  revolution: true,
  bantay: true,
  buwis: true,
  bagsak: false,
  strictPass: false,
  memoryMode: false,
  difficulty: 'normal',
  rounds: 6,
  speed: 'normal',
  sound: true,
  haptics: true,
  autoPass: true,
};

export interface TrickPlay {
  player: number;
  /** null = pass */
  combo: Combo | null;
  /** True when this play triggered a Rebolusyon. */
  flipped?: boolean;
}

export interface Trick {
  top: Combo | null;
  topBy: number;
  plays: TrickPlay[];
  passed: boolean[];
  passesSinceTop: number;
  /** Everyone else passed; `topBy` now leads a fresh trick. */
  done: boolean;
}

export interface Exchange {
  from: number;
  to: number;
  given: Card;
  returned: Card | null;
}

export interface Multiplier {
  label: string;
  factor: number;
}

export interface RoundResult {
  round: number;
  winner: number;
  finishingCombo: Combo;
  cardsLeft: number[];
  leftover: Card[][];
  multipliers: Multiplier[][];
  penalties: number[];
  deltas: number[];
  grandFinish: boolean;
}

export type GameEvent =
  | { kind: 'deal' }
  | { kind: 'play'; player: number; combo: Combo; flipped: boolean }
  | { kind: 'pass'; player: number }
  | { kind: 'clear'; leader: number }
  | { kind: 'lastCard'; player: number }
  | { kind: 'roundEnd'; winner: number }
  | { kind: 'tribute'; exchange: Exchange };

export type LogEntry =
  | { seq: number; kind: 'play'; player: number; combo: Combo; flipped: boolean }
  | { seq: number; kind: 'pass'; player: number }
  | { seq: number; kind: 'clear'; player: number }
  | { seq: number; kind: 'round'; round: number }
  | { seq: number; kind: 'win'; player: number }
  | { seq: number; kind: 'tribute'; exchange: Exchange };

export interface MatchStats {
  revolutions: number[];
  roundWins: number[];
  cardsShed: number[];
}

/**
 * Deductions anyone watching the table could make. Hands only shrink during a round, so a fact
 * stays true for the rest of it.
 */
export type Fact =
  /** Passed on `top`. `hard` when the player could have gone out with a beating combo, so they had none. */
  | { kind: 'noBeat'; player: number; top: Combo; rev: boolean; hard: boolean }
  /** Every other card in the player's hand is weaker than `card` under `rev`. */
  | { kind: 'maxSingle'; player: number; card: Card; rev: boolean; except?: Card; knownTo?: number[] }
  /** The player is holding `card` until it shows up on the table. */
  | { kind: 'holds'; player: number; card: Card; knownTo?: number[] };

export type Phase = 'exchange' | 'playing' | 'roundEnd' | 'matchEnd';

export interface GameState {
  seed: number;
  settings: Settings;
  phase: Phase;
  round: number;
  hands: Card[][];
  turn: number;
  trick: Trick;
  revolution: boolean;
  firstPlay: boolean;
  /** Every card played this round, in order. */
  played: Card[];
  /** Public deductions about hidden hands this round. */
  facts: Fact[];
  scores: number[];
  history: RoundResult[];
  exchange: Exchange | null;
  log: LogEntry[];
  events: GameEvent[];
  eventSeq: number;
  stats: MatchStats;
}

export type ValidationResult = { ok: true; combo: Combo } | { ok: false; reason: string };

const LOG_LIMIT = 80;

const emptyTrick = (leader: number): Trick => ({
  top: null,
  topBy: leader,
  plays: [],
  passed: [false, false, false, false],
  passesSinceTop: 0,
  done: false,
});

export const nextSeat = (p: number) => (p + 1) % PLAYERS;

export const isLeading = (s: GameState) => !s.trick.top || s.trick.done;

type NewLogEntry = LogEntry extends infer E ? (E extends LogEntry ? Omit<E, 'seq'> : never) : never;

function pushLog(s: GameState, entries: NewLogEntry[]): LogEntry[] {
  let seq = s.log.length ? s.log[s.log.length - 1].seq : 0;
  const added = entries.map((e) => ({ ...e, seq: ++seq }) as LogEntry);
  return [...s.log, ...added].slice(-LOG_LIMIT);
}

function holderOf(hands: Card[][], card: Card): number {
  return hands.findIndex((h) => h.includes(card));
}

function dealRound(base: GameState, round: number): GameState {
  const rng = mulberry32(base.seed + round * 7919);
  const deck = shuffle(newDeck(), rng);
  const hands = Array.from({ length: PLAYERS }, (_, p) => deck.slice(p * 13, p * 13 + 13));

  let exchange: Exchange | null = null;
  const facts: Fact[] = [];
  const last = base.history[base.history.length - 1];
  if (base.settings.buwis && last) {
    const loser = pickTributePayer(last);
    const given = Math.max(...hands[loser]);
    hands[loser] = removeCards(hands[loser], [given]);
    hands[last.winner] = [...hands[last.winner], given];
    exchange = { from: loser, to: last.winner, given, returned: null };
    const pair = [loser, last.winner];
    facts.push(
      { kind: 'maxSingle', player: loser, card: given, rev: false, knownTo: pair },
      { kind: 'holds', player: last.winner, card: given, knownTo: pair },
    );
  }

  const leader = holderOf(hands, THREE_OF_CLUBS);
  const s: GameState = {
    ...base,
    phase: exchange ? 'exchange' : 'playing',
    round,
    hands,
    turn: leader,
    trick: emptyTrick(leader),
    revolution: false,
    firstPlay: true,
    played: [],
    facts,
    exchange,
    events: [{ kind: 'deal' }],
    eventSeq: base.eventSeq + 1,
  };
  s.log = pushLog(base, [{ kind: 'round', round }]);
  return s;
}

/** The player with the most cards left pays tribute; ties go to the larger penalty. */
export function pickTributePayer(r: RoundResult): number {
  let best = -1;
  for (let p = 0; p < PLAYERS; p++) {
    if (p === r.winner) continue;
    if (
      best < 0 ||
      r.cardsLeft[p] > r.cardsLeft[best] ||
      (r.cardsLeft[p] === r.cardsLeft[best] && r.penalties[p] > r.penalties[best])
    )
      best = p;
  }
  return best;
}

export function createMatch(settings: Settings, seed = Math.floor(Math.random() * 2 ** 31)): GameState {
  const base: GameState = {
    seed,
    settings,
    phase: 'playing',
    round: 0,
    hands: [[], [], [], []],
    turn: 0,
    trick: emptyTrick(0),
    revolution: false,
    firstPlay: true,
    played: [],
    facts: [],
    scores: [0, 0, 0, 0],
    history: [],
    exchange: null,
    log: [],
    events: [],
    eventSeq: 0,
    stats: { revolutions: [0, 0, 0, 0], roundWins: [0, 0, 0, 0], cardsShed: [0, 0, 0, 0] },
  };
  return dealRound(base, 1);
}

export function nextRound(s: GameState): GameState {
  if (s.phase !== 'roundEnd') return s;
  return dealRound(s, s.round + 1);
}

/** Winner of the previous round hands back one card to the tribute payer. */
export function returnTribute(s: GameState, card: Card): GameState {
  if (s.phase !== 'exchange' || !s.exchange) throw new Error('No tribute pending');
  const { from, to } = s.exchange;
  if (!s.hands[to].includes(card)) throw new Error('Card not in winner hand');
  const hands = s.hands.slice();
  hands[to] = removeCards(hands[to], [card]);
  hands[from] = [...hands[from], card];
  const exchange = { ...s.exchange, returned: card };
  const leader = holderOf(hands, THREE_OF_CLUBS);
  const pair = [from, to];
  // The payer's "best card" fact no longer covers the card they just got back.
  const facts = s.facts.map((f): Fact =>
    f.kind === 'maxSingle' && f.player === from && f.card === s.exchange!.given ? { ...f, except: card } : f,
  );
  facts.push({ kind: 'holds', player: from, card, knownTo: pair });
  return {
    ...s,
    phase: 'playing',
    hands,
    facts,
    exchange,
    turn: leader,
    trick: emptyTrick(leader),
    events: [{ kind: 'tribute', exchange }],
    eventSeq: s.eventSeq + 1,
    log: pushLog(s, [{ kind: 'tribute', exchange }]),
  };
}

/** Strongest single in a hand under the current order. */
export function strongestCard(hand: Card[], revolution: boolean): Card {
  return hand.reduce((best, c) => (power(c, revolution) > power(best, revolution) ? c : best), hand[0]);
}

export function validatePlay(s: GameState, player: number, cards: Card[]): ValidationResult {
  if (s.phase !== 'playing') return { ok: false, reason: 'Not in play' };
  if (s.turn !== player) return { ok: false, reason: 'Not your turn' };
  if (cards.length === 0) return { ok: false, reason: 'Pick some cards' };
  if (!containsAll(s.hands[player], cards)) return { ok: false, reason: 'Cards not in hand' };

  const combo = classify(cards);
  if (!combo) {
    if (cards.length === 4) return { ok: false, reason: 'Four of a Kind needs a fifth card (kicker)' };
    return { ok: false, reason: 'Not a valid combination' };
  }
  if (s.firstPlay && !cards.includes(THREE_OF_CLUBS)) return { ok: false, reason: 'Opening play must include 3♣' };

  if (!isLeading(s)) {
    const top = s.trick.top!;
    if (top.cards.length !== combo.cards.length)
      return { ok: false, reason: `Must play ${top.cards.length} card${top.cards.length > 1 ? 's' : ''}` };
    if (!beats(combo, top, s.revolution)) {
      return { ok: false, reason: s.revolution ? 'Too strong. Rebolusyon is on, so lower cards win' : 'Not strong enough' };
    }
  }

  if (s.settings.bantay && combo.type === 'single') {
    const next = s.hands[nextSeat(player)];
    if (next.length === 1 && combo.cards[0] !== strongestCard(s.hands[player], s.revolution)) {
      return { ok: false, reason: 'Bantay (Guard): next player has 1 card, so play your strongest single' };
    }
  }

  return { ok: true, combo };
}

export function canPass(s: GameState, player: number): boolean {
  return s.phase === 'playing' && s.turn === player && !isLeading(s);
}

/** Every legal play for a player right now (pass not included). */
export function legalPlays(s: GameState, player: number): Combo[] {
  if (s.phase !== 'playing' || s.turn !== player) return [];
  const size = isLeading(s) ? undefined : s.trick.top!.cards.length;
  return enumerateCombos(s.hands[player], size).filter((c) => validatePlay(s, player, c.cards).ok);
}

function nextActive(trick: Trick, from: number, strict: boolean): number {
  for (let i = 1; i <= PLAYERS; i++) {
    const p = (from + i) % PLAYERS;
    if (!strict || !trick.passed[p]) return p;
  }
  return from;
}

function othersAllPassed(trick: Trick, player: number): boolean {
  return trick.passed.every((pass, p) => p === player || pass);
}

export function play(s: GameState, player: number, cards: Card[]): GameState {
  const v = validatePlay(s, player, cards);
  if (!v.ok) throw new Error(v.reason);
  const combo = v.combo;
  const strict = s.settings.strictPass;

  const flipped = s.settings.revolution && combo.type === 'quads';
  const revolution = flipped ? !s.revolution : s.revolution;

  const hands = s.hands.slice();
  hands[player] = removeCards(hands[player], combo.cards);

  const fresh = isLeading(s);
  const prev = fresh ? emptyTrick(player) : s.trick;
  const trick: Trick = {
    top: combo,
    topBy: player,
    plays: [...prev.plays, { player, combo, flipped }],
    passed: strict && !fresh ? prev.passed.slice() : [false, false, false, false],
    passesSinceTop: 0,
    done: false,
  };

  const stats: MatchStats = {
    ...s.stats,
    revolutions: s.stats.revolutions.map((n, p) => (p === player && flipped ? n + 1 : n)),
    cardsShed: s.stats.cardsShed.map((n, p) => (p === player ? n + combo.cards.length : n)),
  };

  const guarded = s.settings.bantay && combo.type === 'single' && s.hands[nextSeat(player)].length === 1;
  const facts: Fact[] = guarded
    ? [...s.facts, { kind: 'maxSingle', player, card: combo.cards[0], rev: s.revolution }]
    : s.facts;

  const events: GameEvent[] = [{ kind: 'play', player, combo, flipped }];
  let next: GameState = {
    ...s,
    hands,
    trick,
    revolution,
    firstPlay: false,
    played: [...s.played, ...combo.cards],
    facts,
    stats,
    log: pushLog(s, [{ kind: 'play', player, combo, flipped }]),
  };

  if (hands[player].length === 0) return endRound({ ...next, events, eventSeq: s.eventSeq + 1 }, player, combo);

  if (hands[player].length === 1) events.push({ kind: 'lastCard', player });

  if (strict && othersAllPassed(trick, player)) {
    next = { ...next, trick: { ...trick, done: true }, turn: player };
    events.push({ kind: 'clear', leader: player });
    next.log = pushLog(next, [{ kind: 'clear', player }]);
  } else {
    next.turn = nextActive(trick, player, strict);
  }
  return { ...next, events, eventSeq: s.eventSeq + 1 };
}

export function pass(s: GameState, player: number): GameState {
  if (!canPass(s, player)) throw new Error('Cannot pass now');
  const strict = s.settings.strictPass;
  const passed = s.trick.passed.slice();
  passed[player] = true;
  const trick: Trick = {
    ...s.trick,
    passed,
    passesSinceTop: s.trick.passesSinceTop + 1,
    plays: [...s.trick.plays, { player, combo: null }],
  };
  const top = s.trick.top!;
  const facts: Fact[] = [
    ...s.facts,
    { kind: 'noBeat', player, top, rev: s.revolution, hard: s.hands[player].length === top.cards.length },
  ];
  const events: GameEvent[] = [{ kind: 'pass', player }];
  let log = pushLog(s, [{ kind: 'pass', player }]);

  const done = strict ? othersAllPassed(trick, trick.topBy) : trick.passesSinceTop >= PLAYERS - 1;
  let turn: number;
  if (done) {
    trick.done = true;
    turn = trick.topBy;
    events.push({ kind: 'clear', leader: turn });
    log = pushLog({ ...s, log }, [{ kind: 'clear', player: turn }]);
  } else {
    turn = nextActive(trick, player, strict);
  }
  return { ...s, trick, turn, facts, events, log, eventSeq: s.eventSeq + 1 };
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

export function penaltyFor(hand: Card[], grandFinish: boolean): { penalty: number; multipliers: Multiplier[] } {
  const n = hand.length;
  const multipliers: Multiplier[] = [];
  if (n === 13) multipliers.push({ label: 'Never played (13)', factor: 3 });
  else if (n >= 10) multipliers.push({ label: '10+ cards left', factor: 2 });
  const twos = hand.filter((c) => rankOf(c) === RANK_TWO).length;
  if (twos > 0) multipliers.push({ label: `Caught holding ${twos > 1 ? `${twos} Twos` : 'a Two'}`, factor: 2 });
  if (grandFinish) multipliers.push({ label: 'Grand finish', factor: 2 });
  const penalty = multipliers.reduce((acc, m) => acc * m.factor, n);
  return { penalty, multipliers };
}

/** With Bagsak on, last round's winner: they pay double unless they win this round too. */
export function defendingChampion(s: GameState): number {
  return s.settings.bagsak && s.history.length ? s.history[s.history.length - 1].winner : -1;
}

function endRound(s: GameState, winner: number, finishingCombo: Combo): GameState {
  const grandFinish = finishingCombo.type === 'quads' || finishingCombo.type === 'straightflush';
  const champion = defendingChampion(s);
  const penalties: number[] = [];
  const multipliers: Multiplier[][] = [];
  for (let p = 0; p < PLAYERS; p++) {
    if (p === winner) {
      penalties.push(0);
      multipliers.push([]);
      continue;
    }
    const r = penaltyFor(s.hands[p], grandFinish);
    if (p === champion) {
      r.multipliers.push({ label: 'Fallen champion', factor: 2 });
      r.penalty *= 2;
    }
    penalties.push(r.penalty);
    multipliers.push(r.multipliers);
  }
  const total = penalties.reduce((a, b) => a + b, 0);
  const deltas = penalties.map((pen, p) => (p === winner ? total : -pen));
  const result: RoundResult = {
    round: s.round,
    winner,
    finishingCombo,
    cardsLeft: s.hands.map((h) => h.length),
    leftover: s.hands.map((h) => h.slice()),
    multipliers,
    penalties,
    deltas,
    grandFinish,
  };
  const scores = s.scores.map((sc, p) => sc + deltas[p]);
  const stats = { ...s.stats, roundWins: s.stats.roundWins.map((n, p) => (p === winner ? n + 1 : n)) };
  return {
    ...s,
    phase: s.round >= s.settings.rounds ? 'matchEnd' : 'roundEnd',
    scores,
    history: [...s.history, result],
    stats,
    events: [...s.events, { kind: 'roundEnd', winner }],
    log: pushLog(s, [{ kind: 'win', player: winner }]),
  };
}

/** Final standings: highest score first. */
export function standings(s: GameState): number[] {
  return [0, 1, 2, 3].sort((a, b) => s.scores[b] - s.scores[a] || s.stats.roundWins[b] - s.stats.roundWins[a]);
}
