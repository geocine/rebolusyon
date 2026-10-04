import { motion } from 'motion/react';
import { type PointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type Card, rankOf } from '../engine/cards';
import { isPowerRank } from '../engine/combos';
import { useViewportHeight } from '../hooks';
import { CardView } from './CardView';
import { Icon } from './Icons';

interface Props {
  hand: Card[];
  selected: Set<Card>;
  hinted: Set<Card>;
  fresh: Set<Card>;
  /** Cards the walkthrough wants you to pick; they glow until selected. */
  pointed?: Set<Card>;
  revolution: boolean;
  onSet: (c: Card, on: boolean) => void;
  /** Swipe up on the hand; `from` is the card the swipe started on, which joins the selection. */
  onSwipeUp: (from: Card | null) => void;
  /** Stagger the entrance while a fresh hand is being dealt. */
  dealing: boolean;
}

interface Gesture {
  x: number;
  y: number;
  start: Card | null;
  mode: 'pending' | 'slide' | 'swipe';
  turnOn: boolean;
  touched: Set<Card>;
}

const SWIPE_PX = 38;
const SLIDE_PX = 10;

function cardAt(x: number, y: number): Card | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-card]');
  return el ? Number(el.dataset.card) : null;
}

export function PlayerHand({ hand, selected, hinted, fresh, pointed, revolution, onSet, onSwipeUp, dealing }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  const vh = useViewportHeight();
  const gesture = useRef<Gesture | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = hand.length;
  const cw = Math.round(Math.min(96, Math.max(54, width * 0.19), vh * 0.15));
  const gap = n > 1 ? Math.min(cw * 0.78, (width - cw - 8) / (n - 1)) : 0;
  const total = n > 0 ? cw + gap * (n - 1) : 0;
  const mid = (n - 1) / 2;
  const lift = cw < 80 ? 20 : 30;
  const arc = cw < 80 ? 0.55 : 0.9;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is best-effort; the gesture still works without it
    }
    gesture.current = { x: e.clientX, y: e.clientY, start: cardAt(e.clientX, e.clientY), mode: 'pending', turnOn: true, touched: new Set() };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (g.mode === 'pending') {
      if (dy < -SWIPE_PX && Math.abs(dy) > Math.abs(dx) * 1.2) {
        g.mode = 'swipe';
        onSwipeUp(g.start);
        return;
      }
      if (Math.abs(dx) > SLIDE_PX && g.start !== null) {
        g.mode = 'slide';
        g.turnOn = !selected.has(g.start);
        g.touched.add(g.start);
        onSet(g.start, g.turnOn);
      }
    }
    if (g.mode === 'slide') {
      const c = cardAt(e.clientX, e.clientY);
      if (c !== null && !g.touched.has(c)) {
        g.touched.add(c);
        onSet(c, g.turnOn);
      }
    }
  };

  const onPointerUp = () => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.mode === 'pending' && g.start !== null) onSet(g.start, !selected.has(g.start));
  };

  return (
    <div
      className="hand"
      ref={ref}
      style={{ ['--cw' as string]: `${cw}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (gesture.current = null)}
    >
      <div className="hand-track" style={{ width: total }}>
        {hand.map((c, i) => {
          const off = i - mid;
          const isSel = selected.has(c);
          const bow = off * off * arc;
          return (
            <CardView
              key={c}
              card={c}
              data-card={c}
              layoutId={`card-${c}`}
              size="lg"
              selected={isSel}
              hint={hinted.has(c)}
              fresh={fresh.has(c)}
              powerCard={isPowerRank(rankOf(c), revolution)}
              className={`hand-card ${pointed?.has(c) && !isSel ? 'pointed' : ''}`}
              style={{ left: i * gap, zIndex: i }}
              initial={{ opacity: 0, y: -260, rotate: -30, scale: 0.5 }}
              animate={{ opacity: 1, y: (isSel ? -lift : 0) + bow, rotate: off * 1.6, scale: 1 }}
              whileHover={{ y: (isSel ? -lift - 6 : -14) + bow }}
              transition={{ type: 'spring', stiffness: 420, damping: 30, delay: dealing ? i * 0.05 : 0 }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ActionProps {
  isTurn: boolean;
  canPass: boolean;
  /** Nothing in hand beats the table: passing is the only move. */
  mustPass: boolean;
  /** Auto-pass countdown length, or null when it isn't running. */
  autoPassMs: number | null;
  canPlay: boolean;
  status: { tone: 'ok' | 'bad' | 'idle'; text: string };
  onPlay: () => void;
  onPass: () => void;
  onClear: () => void;
  onHint: () => void;
  onCycle: () => void;
  onSort: () => void;
  sortMode: 'rank' | 'suit';
  hasSelection: boolean;
}

function PassCountdown({ ms }: { ms: number }) {
  const [left, setLeft] = useState(Math.ceil(ms / 1000));
  useEffect(() => {
    const end = performance.now() + ms;
    const id = window.setInterval(() => setLeft(Math.max(0, Math.ceil((end - performance.now()) / 1000))), 200);
    return () => clearInterval(id);
  }, [ms]);
  return (
    <>
      <span className="pass-count" aria-label={`Passing in ${left} seconds`}>
        {left}
      </span>
      <span className="pass-drain" style={{ animationDuration: `${ms}ms` }} aria-hidden="true" />
    </>
  );
}

export function ActionBar(p: ActionProps) {
  return (
    <div className={`action-bar ${p.isTurn ? 'my-turn' : ''}`}>
      <div className="ab-group ab-tools">
        <button className="btn ghost tool" onClick={p.onSort} title="Sort (S)">
          <Icon name="sort" />
          <span className="btn-label">{p.sortMode === 'rank' ? 'Rank' : 'Suit'}</span>
        </button>
        <button className="btn ghost tool" onClick={p.onCycle} disabled={!p.isTurn} title="Cycle through playable combos (Tab)">
          <Icon name="cycle" />
          <span className="btn-label">Cycle</span>
        </button>
        <button className="btn ghost tool" onClick={p.onHint} disabled={!p.isTurn} title="Ask for a hint (H)">
          <Icon name="bulb" />
          <span className="btn-label">Hint</span>
        </button>
        <button className="btn ghost tool" onClick={p.onClear} disabled={!p.hasSelection} title="Clear selection (Esc)">
          <Icon name="clear" />
          <span className="btn-label">Clear</span>
        </button>
      </div>
      <motion.div
        key={p.status.text}
        className={`ab-status ${p.status.tone}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {p.status.text}
      </motion.div>
      <div className="ab-group ab-main">
        <button className={`btn pass-btn ${p.mustPass ? 'must' : ''}`} onClick={p.onPass} disabled={!p.canPass} title="Pass (Space)">
          Pass
          {p.autoPassMs !== null && <PassCountdown ms={p.autoPassMs} />}
        </button>
        <button className="btn primary play-btn" onClick={p.onPlay} disabled={!p.canPlay} title="Play (Enter)">
          Play
        </button>
      </div>
    </div>
  );
}
