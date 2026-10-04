import { describe, expect, it } from 'vitest';
import { makeCard as mk, mulberry32, THREE_OF_CLUBS } from './cards';
import { beats, classify, enumerateCombos } from './combos';
import {
  DEFAULT_SETTINGS,
  MODE_RULES,
  type GameState,
  type RuleMode,
  type Settings,
  canPass,
  createMatch,
  legalPlays,
  nextRound,
  pass,
  penaltyFor,
  play,
  returnTribute,
  validatePlay,
  withMode,
} from './game';
import { PERSONAS, chooseTributeReturn, decide } from './ai';

// rank indices: 3=0 4=1 5=2 6=3 7=4 8=5 9=6 10=7 J=8 Q=9 K=10 A=11 2=12; suits ♣0 ♠1 ♥2 ♦3
const C = 0, S = 1, H = 2, D = 3;

describe('classify', () => {
  it('recognises every combo type', () => {
    expect(classify([mk(5, H)])?.type).toBe('single');
    expect(classify([mk(5, H), mk(5, C)])?.type).toBe('pair');
    expect(classify([mk(5, H), mk(6, C)])).toBeNull();
    expect(classify([mk(9, H), mk(9, C), mk(9, D)])?.type).toBe('triple');
    expect(classify([mk(0, C), mk(1, H), mk(2, S), mk(3, D), mk(4, C)])?.type).toBe('straight');
    expect(classify([mk(0, H), mk(3, H), mk(5, H), mk(8, H), mk(11, H)])?.type).toBe('flush');
    expect(classify([mk(4, H), mk(4, C), mk(4, D), mk(9, S), mk(9, C)])?.type).toBe('fullhouse');
    expect(classify([mk(7, H), mk(7, C), mk(7, D), mk(7, S), mk(2, C)])?.type).toBe('quads');
    expect(classify([mk(3, S), mk(4, S), mk(5, S), mk(6, S), mk(7, S)])?.type).toBe('straightflush');
  });

  it('rejects straights through the Two and four-card sets', () => {
    expect(classify([mk(8, C), mk(9, H), mk(10, S), mk(11, D), mk(12, C)])).toBeNull();
    expect(classify([mk(7, H), mk(7, C), mk(7, D), mk(7, S)])).toBeNull();
  });
});

describe('ordering', () => {
  it('uses Filipino suit order and 2 as top rank', () => {
    const single = (c: number) => classify([c])!;
    expect(beats(single(mk(0, D)), single(mk(0, H)), false)).toBe(true);
    expect(beats(single(mk(12, C)), single(mk(11, D)), false)).toBe(true);
  });

  it('ranks five-card hands by type, unaffected by Rebolusyon', () => {
    const straight = classify([mk(6, C), mk(7, H), mk(8, S), mk(9, D), mk(10, D)])!;
    const flush = classify([mk(0, C), mk(2, C), mk(4, C), mk(6, C), mk(8, C)])!;
    expect(beats(flush, straight, false)).toBe(true);
    expect(beats(flush, straight, true)).toBe(true);
  });

  it('Rebolusyon inverts comparisons within a type', () => {
    const three = classify([mk(0, C)])!;
    const two = classify([mk(12, D)])!;
    expect(beats(three, two, true)).toBe(true);
    expect(beats(two, three, true)).toBe(false);
  });

  it('pairs compare by highest suit', () => {
    const a = classify([mk(5, C), mk(5, D)])!;
    const b = classify([mk(5, S), mk(5, H)])!;
    expect(beats(a, b, false)).toBe(true);
  });
});

function stateWith(hands: number[][], patch: Partial<GameState> = {}, settings: Partial<Settings> = {}): GameState {
  const base = createMatch({ ...DEFAULT_SETTINGS, ...settings }, 1);
  const holder = hands.findIndex((h) => h.includes(THREE_OF_CLUBS));
  return {
    ...base,
    phase: 'playing',
    hands,
    turn: holder >= 0 ? holder : 0,
    firstPlay: holder >= 0,
    trick: { top: null, topBy: 0, plays: [], passed: [false, false, false, false], passesSinceTop: 0, done: false },
    exchange: null,
    ...patch,
  };
}

describe('turn flow', () => {
  it('requires 3♣ on the opening play', () => {
    const s = stateWith([[0, mk(5, H)], [mk(6, C), mk(6, D)], [mk(7, C)], [mk(8, C)]]);
    expect(validatePlay(s, 0, [mk(5, H)]).ok).toBe(false);
    expect(validatePlay(s, 0, [0]).ok).toBe(true);
  });

  it('clears the trick after three passes and hands the lead back', () => {
    let s = stateWith([[0, mk(5, H)], [mk(6, C), mk(1, C)], [mk(7, C), mk(1, D)], [mk(8, C), mk(1, H)]], {}, { bantay: false });
    s = play(s, 0, [0]);
    s = pass(s, 1);
    s = pass(s, 2);
    s = pass(s, 3);
    expect(s.trick.done).toBe(true);
    expect(s.turn).toBe(0);
    expect(canPass(s, 0)).toBe(false);
  });

  it('strict pass locks a player out of the trick', () => {
    let s = stateWith(
      [[0, mk(5, H), mk(9, C)], [mk(1, C), mk(6, C)], [mk(2, C), mk(7, C)], [mk(3, C), mk(8, C)]],
      {},
      { strictPass: true, bantay: false },
    );
    s = play(s, 0, [0]);
    s = pass(s, 1);
    s = play(s, 2, [mk(2, C)]);
    s = play(s, 3, [mk(3, C)]);
    s = play(s, 0, [mk(5, H)]);
    expect(s.turn).toBe(2);
    s = pass(s, 2);
    s = pass(s, 3);
    expect(s.trick.done).toBe(true);
    expect(s.turn).toBe(0);
  });

  it('Bantay forces the strongest single when the next player is on one card', () => {
    const s = stateWith([[mk(4, C), mk(9, D), mk(1, H)], [mk(6, C)], [mk(7, C), mk(1, C)], [mk(8, C), mk(2, C)]], {
      firstPlay: false,
      turn: 0,
    });
    expect(validatePlay(s, 0, [mk(4, C)]).ok).toBe(false);
    expect(validatePlay(s, 0, [mk(9, D)]).ok).toBe(true);
  });

  it('four of a kind triggers Rebolusyon and toggles back on a second one', () => {
    const quads = [mk(4, C), mk(4, S), mk(4, H), mk(4, D), mk(1, C)];
    let s = stateWith([[...quads, mk(9, C)], [mk(6, C), mk(6, D)], [mk(7, C), mk(7, D)], [mk(8, C), mk(8, D)]], {
      firstPlay: false,
    });
    s = play(s, 0, quads);
    expect(s.revolution).toBe(true);
    expect(s.events.some((e) => e.kind === 'play' && e.flipped)).toBe(true);
  });

  it('Alsa lets only the sole last-place player flip with Three of a Kind', () => {
    const trips = [mk(4, C), mk(4, S), mk(4, H)];
    const hands = () => [[...trips, mk(9, C)], [mk(6, C), mk(6, D)], [mk(7, C), mk(7, D)], [mk(8, C), mk(8, D)]];
    const flipsWith = (scores: number[], rules: Partial<Settings> = {}) =>
      play(stateWith(hands(), { firstPlay: false, scores }, rules), 0, trips).revolution;
    expect(flipsWith([-12, 6, 3, 3])).toBe(true);
    expect(flipsWith([-12, -12, 12, 12])).toBe(false);
    expect(flipsWith([5, -12, 4, 3])).toBe(false);
    expect(flipsWith([-12, 6, 3, 3], { alsa: false })).toBe(false);
  });

  it('ends the round and scores penalties when a hand empties', () => {
    let s = stateWith([[0], [mk(6, C), mk(12, D)], [mk(7, C)], [mk(8, C)]]);
    s = play(s, 0, [0]);
    expect(s.phase).toBe('roundEnd');
    const r = s.history[0];
    expect(r.winner).toBe(0);
    expect(r.penalties).toEqual([0, 4, 1, 1]);
    expect(s.scores).toEqual([6, -4, -1, -1]);
  });
});

describe('scoring', () => {
  it('stacks multipliers', () => {
    const thirteen = Array.from({ length: 13 }, (_, i) => mk(i, C));
    expect(penaltyFor(thirteen, false).penalty).toBe(13 * 3 * 2);
    expect(penaltyFor([mk(1, C), mk(2, C)], true).penalty).toBe(4);
  });
});

describe('rule modes', () => {
  it('a mode overrides every rule flag, whatever was stored before', () => {
    const scrambled = { ...DEFAULT_SETTINGS, revolution: false, bantay: false, buwis: false, patong: false, hirit: true, alsa: true, strictPass: true };
    for (const mode of Object.keys(MODE_RULES) as RuleMode[]) {
      const s = withMode(scrambled, mode);
      expect(s.mode).toBe(mode);
      expect(s).toMatchObject(MODE_RULES[mode]);
    }
  });

  it('an unknown stored mode falls back to Rebolusyon', () => {
    const s = withMode({ ...DEFAULT_SETTINGS, mode: 'bogus' as RuleMode, patong: false });
    expect(s.mode).toBe('rebolusyon');
    expect(s.patong).toBe(true);
  });

  it('the default settings match the Rebolusyon mode', () => {
    expect(withMode(DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('comeback stakes', () => {
  const hands = () => [[0], [mk(6, C), mk(12, D)], [mk(7, C)], [mk(8, C)]];
  const finish = (patch: Partial<GameState>, rules: Partial<Settings> = {}) => play(stateWith(hands(), patch, rules), 0, [0]).history[0];

  it('Patong doubles the match leader’s penalty when someone else wins', () => {
    const r = finish({ scores: [0, 10, -5, -5] });
    expect(r.penalties).toEqual([0, 8, 1, 1]);
    expect(r.multipliers[1].map((m) => m.label)).toContain('Patong');
    expect(r.deltas[0]).toBe(10);
  });

  it('Patong needs a sole leader and the rule on', () => {
    expect(finish({ scores: [10, 0, -5, -5] }).penalties).toEqual([0, 4, 1, 1]);
    expect(finish({ scores: [0, 10, 10, -20] }).penalties).toEqual([0, 4, 1, 1]);
    expect(finish({ scores: [0, 10, -5, -5] }, { patong: false }).penalties).toEqual([0, 4, 1, 1]);
  });

  it('Huling Hirit doubles every penalty in the final round and stacks with Patong', () => {
    expect(finish({ round: 6 }).penalties).toEqual([0, 8, 2, 2]);
    expect(finish({ round: 6, scores: [0, 10, -5, -5] }).penalties).toEqual([0, 16, 2, 2]);
    expect(finish({ round: 5 }).penalties).toEqual([0, 4, 1, 1]);
    expect(finish({ round: 6 }, { hirit: false }).penalties).toEqual([0, 4, 1, 1]);
  });
});

describe('buwis tribute', () => {
  it('moves the payer’s best card to the winner and back again', () => {
    let s = createMatch({ ...DEFAULT_SETTINGS }, 42);
    const rng = mulberry32(5);
    let guard = 0;
    while (s.phase === 'playing' && guard++ < 500) {
      const d = decide(s, s.turn, PERSONAS[s.turn], 'normal', rng);
      s = d.combo ? play(s, s.turn, d.combo.cards) : pass(s, s.turn);
    }
    expect(s.phase).toBe('roundEnd');
    s = nextRound(s);
    expect(s.phase).toBe('exchange');
    const ex = s.exchange!;
    expect(s.hands[ex.to]).toHaveLength(14);
    expect(s.hands[ex.from]).toHaveLength(12);
    expect(Math.max(...s.hands[ex.from])).toBeLessThan(ex.given);
    s = returnTribute(s, chooseTributeReturn(s, ex.to));
    expect(s.hands.every((h) => h.length === 13)).toBe(true);
    expect(s.phase).toBe('playing');
  });
});

describe('AI self-play', () => {
  const variants: Partial<Settings>[] = [
    {},
    { strictPass: true },
    { revolution: false, bantay: false, buwis: false },
    { memoryMode: true },
    { patong: false, hirit: false, alsa: false },
  ];

  it('plays hundreds of full matches with only legal moves', () => {
    let rounds = 0;
    let revolutions = 0;
    const wins = [0, 0, 0, 0];
    const difficulties = ['easy', 'normal', 'hard'] as const;
    for (let m = 0; m < 60; m++) {
      const settings = { ...DEFAULT_SETTINGS, ...variants[m % variants.length], rounds: 4 };
      let s = createMatch(settings, 1000 + m);
      const rng = mulberry32(m);
      let guard = 0;
      while (s.phase !== 'matchEnd') {
        if (guard++ > 4000) throw new Error('match did not terminate');
        if (s.phase === 'exchange') s = returnTribute(s, chooseTributeReturn(s, s.exchange!.to));
        else if (s.phase === 'roundEnd') {
          rounds++;
          s = nextRound(s);
        } else {
          const p = s.turn;
          const d = decide(s, p, PERSONAS[p], difficulties[m % 3], rng);
          if (d.combo) {
            expect(validatePlay(s, p, d.combo.cards).ok).toBe(true);
            s = play(s, p, d.combo.cards);
          } else {
            expect(canPass(s, p)).toBe(true);
            s = pass(s, p);
          }
        }
      }
      rounds++;
      s.stats.roundWins.forEach((w, p) => (wins[p] += w));
      revolutions += s.stats.revolutions.reduce((a, b) => a + b, 0);
      expect(s.scores.reduce((a, b) => a + b, 0)).toBe(0);
    }
    expect(rounds).toBe(240);
    console.log('round wins by seat', wins, 'revolutions', revolutions);
  }, 120_000);

  it('the opening AI move always includes 3♣', () => {
    for (let seed = 0; seed < 30; seed++) {
      const s = createMatch({ ...DEFAULT_SETTINGS }, seed);
      const d = decide(s, s.turn, PERSONAS[s.turn], 'hard', mulberry32(seed));
      expect(d.combo?.cards).toContain(THREE_OF_CLUBS);
      expect(legalPlays(s, s.turn).every((c) => c.cards.includes(THREE_OF_CLUBS))).toBe(true);
    }
  });

  it('enumerates the combos in a hand', () => {
    const hand = [mk(0, C), mk(0, H), mk(1, C), mk(2, C), mk(3, C), mk(4, C)];
    const combos = enumerateCombos(hand);
    expect(combos.some((c) => c.type === 'straightflush')).toBe(true);
    expect(combos.some((c) => c.type === 'pair')).toBe(true);
  });
});
