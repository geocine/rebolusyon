import { describe, expect, it } from 'vitest';
import { makeCard as mk, mulberry32, power } from './cards';
import { DEFAULT_SETTINGS, type GameState, type Settings, canPass, createMatch, nextRound, pass, play, returnTribute, validatePlay, withMode } from './game';
import { PERSONAS, chooseTributeReturn, decide } from './ai';
import { sampleWorld } from './belief';
import { rolloutMove, simFrom } from './sim';
import { think } from './search';

const REBOLUSYON = withMode(DEFAULT_SETTINGS, 'rebolusyon');

const C = 0, H = 2, D = 3;

function playToRoundEnd(s: GameState, rng = mulberry32(1)): GameState {
  let g = s;
  for (let i = 0; i < 500 && g.phase === 'playing'; i++) {
    const d = decide(g, g.turn, PERSONAS[g.turn], 'normal', rng);
    g = d.combo ? play(g, g.turn, d.combo.cards) : pass(g, g.turn);
  }
  return g;
}

describe('public facts', () => {
  it('records a hard "could not beat it" fact when a pass skips a winning chance', () => {
    const base = createMatch({ ...REBOLUSYON, bantay: false }, 1);
    let s: GameState = {
      ...base,
      hands: [[mk(5, C), mk(9, C)], [mk(3, D)], [mk(7, C), mk(8, C)], [mk(10, C), mk(11, C)]],
      turn: 0,
      firstPlay: false,
      trick: { top: null, topBy: 0, plays: [], passed: [false, false, false, false], passesSinceTop: 0, done: false },
    };
    s = play(s, 0, [mk(9, C)]);
    s = pass(s, 1);
    const f = s.facts[s.facts.length - 1];
    expect(f).toMatchObject({ kind: 'noBeat', player: 1, hard: true });
    s = pass(s, 2);
    expect(s.facts[s.facts.length - 1]).toMatchObject({ kind: 'noBeat', player: 2, hard: false });
  });

  it('records the tribute payer’s ceiling, visible only to the two players involved', () => {
    let s = playToRoundEnd(createMatch({ ...REBOLUSYON }, 42));
    s = nextRound(s);
    const ex = s.exchange!;
    const ceiling = s.facts.find((f) => f.kind === 'maxSingle');
    expect(ceiling).toMatchObject({ player: ex.from, card: ex.given, knownTo: [ex.from, ex.to] });
    s = returnTribute(s, chooseTributeReturn(s, ex.to));
    expect(s.facts.some((f) => f.kind === 'holds' && f.player === ex.from)).toBe(true);
  });
});

describe('belief sampling', () => {
  it('deals plausible hidden hands of the right sizes', () => {
    let s = createMatch({ ...REBOLUSYON }, 7);
    const rng = mulberry32(2);
    for (let i = 0; i < 12; i++) {
      const d = decide(s, s.turn, PERSONAS[s.turn], 'normal', rng);
      s = d.combo ? play(s, s.turn, d.combo.cards) : pass(s, s.turn);
    }
    for (let k = 0; k < 50; k++) {
      const w = sampleWorld(s, 2, { memory: 1, inference: 1 }, rng);
      expect(w[2]).toEqual(s.hands[2]);
      w.forEach((h, p) => expect(h).toHaveLength(s.hands[p].length));
      const all = w.flat();
      expect(new Set(all).size).toBe(all.length);
      expect(all.some((c) => s.played.includes(c))).toBe(false);
    }
  });

  it('never gives a player a card above their known ceiling', () => {
    const base = createMatch({ ...REBOLUSYON }, 3);
    const s: GameState = {
      ...base,
      facts: [{ kind: 'maxSingle', player: 1, card: mk(6, C), rev: false }],
    };
    const rng = mulberry32(9);
    for (let k = 0; k < 40; k++) {
      const w = sampleWorld(s, 0, { memory: 1, inference: 1 }, rng);
      expect(w[1].every((c) => power(c, false) < power(mk(6, C), false))).toBe(true);
    }
  });
});

describe('rollout policy', () => {
  const variants: Partial<Settings>[] = [{}, { strictPass: true }, { revolution: false, bantay: false }, withMode(REBOLUSYON, 'klasiko')];
  it('only makes moves the real engine accepts', () => {
    for (let m = 0; m < 40; m++) {
      let s = createMatch({ ...REBOLUSYON, ...variants[m % variants.length], buwis: false }, 500 + m);
      const rng = mulberry32(m);
      for (let i = 0; i < 500 && s.phase === 'playing'; i++) {
        const p = s.turn;
        if (s.firstPlay) {
          const d = decide(s, p, PERSONAS[p], 'normal', rng);
          s = play(s, p, d.combo!.cards);
          continue;
        }
        const move = rolloutMove(simFrom(s, s.hands), rng);
        if (move) {
          expect(validatePlay(s, p, move.cards)).toMatchObject({ ok: true });
          s = play(s, p, move.cards);
        } else {
          expect(canPass(s, p)).toBe(true);
          s = pass(s, p);
        }
      }
      expect(s.phase).not.toBe('playing');
    }
  });
});

describe('search', () => {
  it('always returns a legal move and a win estimate', () => {
    let s = createMatch({ ...REBOLUSYON, buwis: false }, 77);
    const rng = mulberry32(4);
    let estimates = 0;
    for (let i = 0; i < 400 && s.phase === 'playing'; i++) {
      const p = s.turn;
      const t = think(s, p, i % 2 ? 'normal' : 'rival', rng, { budgetMs: 5 });
      if (t.winProb !== null) {
        estimates++;
        expect(t.winProb).toBeGreaterThanOrEqual(0);
        expect(t.winProb).toBeLessThanOrEqual(1);
      }
      if (t.combo) {
        expect(validatePlay(s, p, t.combo.cards).ok).toBe(true);
        s = play(s, p, t.combo.cards);
      } else {
        expect(canPass(s, p)).toBe(true);
        s = pass(s, p);
      }
    }
    expect(s.phase).not.toBe('playing');
    expect(estimates).toBeGreaterThan(0);
  }, 60_000);

  it('plays a Klasiko round out to the last place with legal moves', () => {
    let s = createMatch({ ...withMode(REBOLUSYON, 'klasiko'), rounds: 1 }, 91);
    const rng = mulberry32(8);
    for (let i = 0; i < 600 && s.phase === 'playing'; i++) {
      const p = s.turn;
      const t = think(s, p, 'hard', rng, { budgetMs: 4 });
      if (t.combo) {
        expect(validatePlay(s, p, t.combo.cards).ok).toBe(true);
        s = play(s, p, t.combo.cards);
      } else {
        expect(canPass(s, p)).toBe(true);
        s = pass(s, p);
      }
    }
    expect(s.phase).toBe('matchEnd');
    expect(s.history[0].places).toHaveLength(4);
  }, 60_000);

  it('never peeks: reshuffling the hidden cards between opponents changes nothing', () => {
    let s = createMatch({ ...REBOLUSYON, buwis: false }, 11);
    const rng = mulberry32(6);
    let checked = 0;
    for (let i = 0; i < 400 && s.phase === 'playing'; i++) {
      const me = s.turn;
      if (!s.firstPlay) {
        const others = [0, 1, 2, 3].filter((p) => p !== me);
        const hidden = others.flatMap((p) => s.hands[p]);
        const shuffled = hidden.slice().reverse();
        const hands = s.hands.slice();
        let k = 0;
        for (const p of others) hands[p] = shuffled.slice(k, (k += s.hands[p].length));
        const peeked: GameState = { ...s, hands };
        for (const d of ['easy', 'normal', 'hard', 'rival'] as const) {
          const a = think(s, me, d, mulberry32(i), { budgetMs: 0 });
          const b = think(peeked, me, d, mulberry32(i), { budgetMs: 0 });
          expect(b).toEqual(a);
        }
        checked++;
      }
      const d = decide(s, me, PERSONAS[me], 'normal', rng);
      s = d.combo ? play(s, me, d.combo.cards) : pass(s, me);
    }
    expect(checked).toBeGreaterThan(20);
  }, 60_000);

  it('takes the win when it can go out', () => {
    const base = createMatch({ ...REBOLUSYON, bantay: false }, 1);
    const s: GameState = {
      ...base,
      hands: [[mk(1, C), mk(2, C)], [mk(12, D), mk(12, H)], [mk(7, C), mk(7, D)], [mk(10, C), mk(11, C)]],
      turn: 1,
      firstPlay: false,
      trick: { top: null, topBy: 1, plays: [], passed: [false, false, false, false], passesSinceTop: 0, done: false },
    };
    const t = think(s, 1, 'hard', mulberry32(1), { budgetMs: 5 });
    expect(t.combo?.cards).toEqual([mk(12, H), mk(12, D)]);
  });
});
