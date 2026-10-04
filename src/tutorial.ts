import { type Card, RANKS, SUITS, cardLabel, makeCard, mulberry32, rankOf } from './engine/cards';
import { type GameState, type Settings, HUMAN, canPass, createMatch, pass, play, validatePlay } from './engine/game';
import { PERSONAS, decide } from './engine/ai';
import type { Mechanic } from './mechanics';

/** "10♥" → card. Keeps the lesson tables readable. */
export function c(label: string): Card {
  const suit = SUITS.indexOf(label.slice(-1) as (typeof SUITS)[number]);
  const rank = RANKS.indexOf(label.slice(0, -1) as (typeof RANKS)[number]);
  if (suit < 0 || rank < 0) throw new Error(`Bad card ${label}`);
  return makeCard(rank, suit);
}
const cs = (labels: string) => labels.split(' ').map(c);

export const HOST = { name: 'Tita Cora', title: 'Your host', color: '#c08a96', initials: 'TC' };

export interface StepCtx {
  /** Reason the last play attempt was refused, if any. */
  rejected: string | null;
}

type Text = string | ((g: GameState) => string);

export interface Step {
  /** What Tita Cora says. `**word**` is bold. */
  say: Text;
  /** Cards to light up in your hand. */
  point?: Card[];
  /** Advances on its own once this holds; without it the step waits for a tap. */
  until?: (g: GameState, ctx: StepCtx) => boolean;
  /** Label for the tap-to-continue button. */
  cta?: string;
  /** A seat heckles when the step starts. */
  shout?: [seat: number, text: Text];
  /** The step happens inside a dialog, so the host speaks from there instead of the table. */
  inModal?: boolean;
}

/** What the player is expected to do, used by tests to prove every lesson can be cleared. */
export type SolutionMove = { play: Card[] } | { try: Card[] } | { give: Card } | { tap: true };

export type BotMove = Card[] | 'pass';

export interface Lesson {
  id: string;
  /** Label on the lesson map. */
  short: string;
  title: string;
  term?: Mechanic;
  tagline: string;
  setup: (base: Settings) => GameState;
  bots: Partial<Record<number, BotMove[]>>;
  steps: Step[];
  /** Bots sit still for the whole lesson. */
  frozen?: boolean;
  /** Show the real end-of-round bill. */
  bill?: boolean;
  /** Line on the lesson-cleared card. */
  clear: string;
  solution: SolutionMove[];
}

const has = (g: GameState, card: Card) => g.played.includes(card);
const over = (g: GameState) => g.phase === 'roundEnd' || g.phase === 'matchEnd';
const myTurnToLead = (g: GameState) => g.phase === 'playing' && g.turn === HUMAN && (!g.trick.top || g.trick.done);

function table(base: Settings, lesson: number, hands: Card[][], extra: Partial<GameState> = {}, rules: Partial<Settings> = {}): GameState {
  const m = createMatch(
    { ...base, revolution: true, bantay: true, buwis: false, patong: false, hirit: false, strictPass: false, memoryMode: false, rounds: LESSONS.length, ...rules },
    1,
  );
  const turn = extra.turn ?? HUMAN;
  return {
    ...m,
    phase: 'playing',
    round: lesson + 1,
    hands,
    turn,
    trick: { top: null, topBy: turn, plays: [], passed: [false, false, false, false], passesSinceTop: 0, done: false },
    firstPlay: false,
    revolution: false,
    played: [],
    facts: [],
    exchange: null,
    log: [],
    events: [{ kind: 'deal' }],
    eventSeq: 1,
    ...extra,
  };
}

const PASSES: BotMove[] = ['pass', 'pass', 'pass', 'pass'];

export const LESSONS: Lesson[] = [
  {
    id: 'basics',
    short: 'Basics',
    title: 'Pusoy Dos in 60 seconds',
    tagline: 'Never played? Start here. Four cards, one trick, one win.',
    setup: (base) =>
      table(
        base,
        0,
        [cs('3♣ 8♠ 8♥ A♦'), cs('6♣ 10♠ J♥ Q♣ 4♦ 5♠'), cs('K♣ 7♦ 9♥ 4♥ 5♦ Q♥'), cs('5♣ 7♣ 9♣ J♣ 10♦ 6♥')],
        { firstPlay: true },
      ),
    bots: { 1: [[c('6♣')], ...PASSES], 2: [[c('K♣')], ...PASSES], 3: PASSES },
    steps: [
      {
        say: 'Welcome to my table, anak! First one to empty their hand wins. Whoever holds the **3♣** opens, and that first play has to include it. Tap your 3♣, then **Play**.',
        point: [c('3♣')],
        until: (g) => has(g, c('3♣')),
      },
      {
        say: 'Now everyone answers with the **same number of cards**, and it has to **beat** what’s on top. Or they pass. Watch.',
        until: (g) => g.turn === HUMAN && has(g, c('K♣')),
      },
      {
        say: 'Ranks run **3 lowest → 2 highest**. Kuya’s K♣ is on top, and your **A♦** beats it.',
        point: [c('A♦')],
        shout: [2, 'King of clubs, pare. Beat that!'],
        until: (g) => has(g, c('A♦')),
      },
      {
        say: 'Same rank? Suits break the tie: **♣ < ♠ < ♥ < ♦**. So that’s the best Ace in the deck. Let’s see who can top it…',
        until: (g) => myTurnToLead(g) || over(g),
      },
      {
        say: 'Nobody! Everyone passed, so the table clears and **you lead anything**. A pair can only be answered by a pair. Finish with your **8s**.',
        point: [c('8♠'), c('8♥')],
        until: over,
      },
    ],
    clear: 'That’s Pusoy Dos. Now for the twists that make this table chaotic.',
    solution: [{ play: [c('3♣')] }, { play: [c('A♦')] }, { play: cs('8♠ 8♥') }],
  },
  {
    id: 'rebolusyon',
    short: 'Rebolusyon',
    title: 'Flip the table',
    term: 'revolution',
    tagline: 'Turn the worst hand at the table into the best one.',
    setup: (base) =>
      table(base, 1, [
        cs('5♣ 5♠ 5♥ 5♦ 9♣ 4♥ 3♦'),
        cs('A♣ A♠ K♦ J♣ 10♥ 8♣'),
        cs('2♣ 2♠ 2♥ A♦ K♥ Q♠'),
        cs('2♦ A♥ K♣ Q♦ J♦ 9♦'),
      ]),
    bots: { 1: PASSES, 2: PASSES, 3: PASSES },
    steps: [
      {
        say: 'Look at your hand. Fives, a Four, a Three. **Junk.** Meanwhile Kuya is sitting on three Twos. Normally you’d be finished.',
        shout: [2, 'Three Twos, pare. Sorry na lang!'],
        cta: 'Hay naku. Now what?',
      },
      {
        say: 'But you have **four 5s**. Four of a Kind, plus any fifth card as a kicker, starts a **Rebolusyon**. Pick the four 5s and the 9♣, then **Play**.',
        point: cs('5♣ 5♠ 5♥ 5♦ 9♣'),
        until: (g) => g.revolution,
      },
      {
        say: 'The order just **flipped**. Lower beats higher now: Threes are kings, Twos are trash. Lead your **4♥**. Who can go lower?',
        point: [c('4♥')],
        shout: [2, 'HALA! My Twos!'],
        until: (g) => g.hands[HUMAN].length <= 1 && (myTurnToLead(g) || over(g)),
      },
      {
        say: 'Nobody could get under it. Your 3♦ is the second-strongest card in the deck now. Lead it and you’re out!',
        point: [c('3♦')],
        until: over,
      },
    ],
    clear: 'Viva la Rebolusyon! Another Four of a Kind flips it back, and the order resets every round.',
    solution: [{ tap: true }, { play: cs('5♣ 5♠ 5♥ 5♦ 9♣') }, { play: [c('4♥')] }, { play: [c('3♦')] }],
  },
  {
    id: 'bantay',
    short: 'Bantay',
    title: 'Guard the last card',
    term: 'bantay',
    tagline: 'Someone is down to one card. Don’t feed them.',
    setup: (base) => table(base, 2, [cs('4♣ 9♠ 9♥ 2♦'), cs('A♠'), cs('6♣ 7♥ 8♦ J♠ Q♥'), cs('5♦ 10♣ K♠ J♦ 6♦')]),
    bots: { 1: PASSES, 2: PASSES, 3: PASSES },
    steps: [
      {
        say: 'Lola is on her **last card**, and she plays right after you. She’s smiling. Go on, try to lead your cheap **4♣**. Tap it.',
        point: [c('4♣')],
        shout: [1, 'Sige, apo. Lead something small.'],
        until: (g, ctx) => !!ctx.rejected?.startsWith('Bantay') || g.played.length > 0,
      },
      {
        say: '**Bantay!** (Guard) When the next player has one card, any single you play must be your **strongest**. No feeding Lola. But Bantay only guards singles. Lead your **pair of 9s**.',
        point: cs('9♠ 9♥'),
        shout: [1, 'Ay, caught me.'],
        until: (g) => has(g, c('9♠')) && (myTurnToLead(g) || over(g)),
      },
      {
        say: 'One card can’t answer a pair. Now you need a single, so it has to be your best: the **2♦**.',
        point: [c('2♦')],
        until: (g) => has(g, c('2♦')) && (myTurnToLead(g) || over(g)),
      },
      {
        say: 'Nothing tops a 2♦. Your last card isn’t food for Lola anymore: you’re **leading it to go out**.',
        point: [c('4♣')],
        until: over,
      },
    ],
    clear: 'Bantay cuts both ways: when you’re down to one card, Mika has to throw you her strongest single.',
    solution: [{ try: [c('4♣')] }, { play: cs('9♠ 9♥') }, { play: [c('2♦')] }, { play: [c('4♣')] }],
  },
  {
    id: 'buwis',
    short: 'Buwis',
    title: 'Pay your taxes',
    term: 'buwis',
    tagline: 'Winners collect. Losers pay. Every single round.',
    setup: (base) =>
      table(
        base,
        3,
        [cs('3♦ 4♣ 7♠ 9♥ J♣ K♦ 2♠'), cs('3♣ 6♠ 9♦ J♥ K♠ A♣'), cs('5♣ 6♥ 8♠ 10♦ Q♣ A♥'), cs('4♥ 7♦ 8♣ 10♠ Q♥ K♥')],
        { phase: 'exchange', exchange: { from: 2, to: HUMAN, given: c('2♠'), returned: null } },
        { buwis: true },
      ),
    bots: {},
    frozen: true,
    steps: [
      {
        say: 'New round! You won the last one, so it’s tax day. **Buwis** (Tribute): the biggest loser pays the winner their **best card**. Kuya just handed you his **2♠**. Now send one card back. Make it hurt.',
        shout: [2, 'Ingatan mo ’yan, ha. Take care of my baby.'],
        inModal: true,
        until: (g) => g.phase === 'playing',
      },
      {
        say: (g) => {
          const back = g.exchange?.returned ?? null;
          const verdict =
            back === c('3♦')
              ? 'Ruthless. The 3♦, the weakest card you had. Lola is proud of you.'
              : back !== null && rankOf(back) === 12
                ? 'You gave him his Two back?! So generous, anak. Too generous.'
                : `The ${back === null ? 'card' : cardLabel(back)}, hmm. Your 3♦ was even more useless, but okay.`;
          return `${verdict} One more thing: you now know Kuya’s best card is **weaker than a 2♠**. The bots remember things like that too.`;
        },
        shout: [1, (g) => (g.exchange?.returned === c('3♦') ? 'Ganyan, apo! No mercy.' : 'Next time, give him the 3, apo.')],
        cta: 'Noted, Tita',
      },
    ],
    clear: 'Win big and the taxes roll in. Lose big and you pay them. It snowballs both ways.',
    solution: [{ give: c('3♦') }, { tap: true }],
  },
  {
    id: 'bill',
    short: 'Scoring',
    title: 'Make them pay',
    tagline: 'Losers pay per card. Multipliers stack. Finish with a bang.',
    setup: (base) =>
      table(base, 4, [
        cs('7♣ 7♠ 7♥ 7♦ 9♣ J♦'),
        cs('2♥ 3♣ 3♠ 4♦ 5♥ 6♣ 8♥ 10♣ Q♦ K♣'),
        cs('2♣ 2♠ A♥ K♥ 4♣ 6♠ 8♦'),
        cs('3♥ 6♦ 10♠ Q♠'),
      ]),
    bots: { 1: PASSES, 2: PASSES, 3: PASSES },
    bill: true,
    steps: [
      {
        say: 'Last lesson: getting paid. Losers pay **1 point per card** left. Go out on **Four of a Kind** or a **Straight Flush** and it’s a **Grand Finish**: everyone pays **double**. So save the 7s for last. Lead the **J♦**.',
        point: [c('J♦')],
        shout: [2, 'Pass muna. Saving my Twos for later.'],
        until: (g) => (has(g, c('J♦')) && myTurnToLead(g)) || over(g),
      },
      {
        say: 'Table’s yours. Finish in style: **four 7s + the 9♣**.',
        point: cs('7♣ 7♠ 7♥ 7♦ 9♣'),
        until: over,
      },
      {
        say: (g) => {
          const r = g.history[g.history.length - 1];
          if (!r?.grandFinish) return 'You went out, but not on the Four of a Kind, so no Grand Finish. Retry to see the double!';
          return `Look at that bill! Kuya got **caught holding Twos** (×2). Lola is stuck with **10+ cards** (×2) *and* a Two (×2). And your **Grand Finish** doubles everyone. **+${r.deltas[HUMAN]}** for you.`;
        },
        shout: [2, 'Saving them for later… there is no later. Hay.'],
        inModal: true,
        cta: 'Collect',
      },
    ],
    clear: 'Never get caught holding Twos. And if you can, go out on a Four of a Kind.',
    solution: [{ play: [c('J♦')] }, { play: cs('7♣ 7♠ 7♥ 7♦ 9♣') }, { tap: true }],
  },
];

export const textOf = (t: Text, g: GameState) => (typeof t === 'function' ? t(g) : t);

/** A bot's turn in a lesson: its next scripted move, or a sensible one if the script no longer fits. */
export function tutorBotMove(g: GameState, seat: number, lesson: Lesson, cursor: number[]): GameState {
  const script = lesson.bots[seat] ?? [];
  const move = script[cursor[seat]++];
  if (move === 'pass' && canPass(g, seat)) return pass(g, seat);
  if (Array.isArray(move) && validatePlay(g, seat, move).ok) return play(g, seat, move);
  const d = decide(g, seat, PERSONAS[seat], 'easy', mulberry32(g.eventSeq));
  return d.combo ? play(g, seat, d.combo.cards) : pass(g, seat);
}

/** Lesson cleared stamps, each a word you'd hear at the table. */
export const STAMPS = [
  { word: 'PANALO!', en: 'Win!' },
  { word: 'GALING!', en: 'Nice one!' },
  { word: 'ASTIG!', en: 'So cool!' },
  { word: 'GRABE!', en: 'Whoa!' },
  { word: 'LODI!', en: 'Idol!' },
];

export interface TutorialProgress {
  cleared: string[];
  graduated: boolean;
}

const KEY = 'rebolusyon.tutorial.v1';

export function loadTutorial(): TutorialProgress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { cleared: [], graduated: false, ...JSON.parse(raw) } : { cleared: [], graduated: false };
  } catch {
    return { cleared: [], graduated: false };
  }
}

export const saveTutorial = (p: TutorialProgress) => localStorage.setItem(KEY, JSON.stringify(p));
