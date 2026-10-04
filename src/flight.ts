import type { Card } from './engine/cards';
import { type GameState, HUMAN } from './engine/game';

/** Where a card was on screen just before it was played. */
export interface Origin {
  x: number;
  y: number;
  width: number;
  rotate: number;
  faceDown: boolean;
}

const origins = new Map<Card, Origin>();

export function rotationOf(el: Element): number {
  const m = getComputedStyle(el).transform;
  if (!m || m === 'none') return 0;
  const [a, b] = m.slice(m.indexOf('(') + 1, -1).split(',').map(Number);
  return (Math.atan2(b, a) * 180) / Math.PI;
}

function originOf(el: HTMLElement, faceDown: boolean): Origin {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, width: el.offsetWidth, rotate: rotationOf(el), faceDown };
}

/**
 * Snapshot the on-screen spot of cards about to be played, while they're still in the hand or fan.
 * Bots' fans are face-down and unordered, so their cards leave from the middle of the fan.
 */
export function captureOrigins(player: number, cards: Card[]) {
  if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (player === HUMAN) {
    for (const c of cards) {
      const el = document.querySelector<HTMLElement>(`.hand [data-card="${c}"]`);
      if (el) origins.set(c, originOf(el, false));
    }
    return;
  }
  const fan = [...document.querySelectorAll<HTMLElement>(`.seat[data-player="${player}"] .fan-card`)];
  const start = Math.max(0, Math.floor((fan.length - cards.length) / 2));
  cards.forEach((c, i) => {
    const el = fan[start + i];
    if (el) origins.set(c, originOf(el, true));
  });
}

/** Pass-through for state transitions: captures origins when `next` adds a play. */
export function withFlight(prev: GameState, next: GameState): GameState {
  const last = next.trick.plays[next.trick.plays.length - 1];
  if (last?.combo && last !== prev.trick.plays[prev.trick.plays.length - 1]) captureOrigins(last.player, last.combo.cards);
  return next;
}

export const hasOrigin = (c: Card) => origins.has(c);

export function takeOrigin(c: Card): Origin | undefined {
  const o = origins.get(c);
  origins.delete(c);
  return o;
}
