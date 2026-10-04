import { motion } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { type Card, rankOf } from '../engine/cards';
import { isPowerRank } from '../engine/combos';
import { CardView } from './CardView';

interface Props {
  hand: Card[];
  selected: Set<Card>;
  hinted: Set<Card>;
  fresh: Set<Card>;
  revolution: boolean;
  onToggle: (c: Card) => void;
  /** Stagger the entrance while a fresh hand is being dealt. */
  dealing: boolean;
}

const CARD_W = 96;

export function PlayerHand({ hand, selected, hinted, fresh, revolution, onToggle, dealing }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const n = hand.length;
  const cw = width < 640 ? 64 : width < 1000 ? 80 : CARD_W;
  const gap = n > 1 ? Math.min(cw * 0.78, (width - cw - 8) / (n - 1)) : 0;
  const total = n > 0 ? cw + gap * (n - 1) : 0;
  const mid = (n - 1) / 2;

  return (
    <div className="hand" ref={ref} style={{ ['--cw' as string]: `${cw}px` }}>
      <div className="hand-track" style={{ width: total }}>
        {hand.map((c, i) => {
          const off = i - mid;
          const isSel = selected.has(c);
          return (
            <CardView
              key={c}
              card={c}
              layoutId={`card-${c}`}
              size="lg"
              selected={isSel}
              hint={hinted.has(c)}
              fresh={fresh.has(c)}
              powerCard={isPowerRank(rankOf(c), revolution)}
              className="hand-card"
              onClick={() => onToggle(c)}
              style={{ left: i * gap, zIndex: i }}
              initial={{ opacity: 0, y: -260, rotate: -30, scale: 0.5 }}
              animate={{
                opacity: 1,
                y: (isSel ? -30 : 0) + Math.abs(off) * Math.abs(off) * 0.9,
                rotate: off * 1.6,
                scale: 1,
              }}
              whileHover={{ y: (isSel ? -36 : -14) + Math.abs(off) * Math.abs(off) * 0.9 }}
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

export function ActionBar(p: ActionProps) {
  return (
    <div className={`action-bar ${p.isTurn ? 'my-turn' : ''}`}>
      <div className="ab-group">
        <button className="btn ghost" onClick={p.onSort} title="Sort (S)">
          Sort: {p.sortMode === 'rank' ? 'Rank' : 'Suit'}
        </button>
        <button className="btn ghost" onClick={p.onCycle} disabled={!p.isTurn} title="Cycle through playable combos (Tab)">
          Cycle ⟳
        </button>
        <button className="btn ghost" onClick={p.onHint} disabled={!p.isTurn} title="Ask for a hint (H)">
          Hint
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
      <div className="ab-group">
        <button className="btn ghost" onClick={p.onClear} disabled={!p.hasSelection} title="Clear selection (Esc)">
          Clear
        </button>
        <button className="btn pass-btn" onClick={p.onPass} disabled={!p.canPass} title="Pass (Space)">
          Pass
        </button>
        <button className="btn primary play-btn" onClick={p.onPlay} disabled={!p.canPlay} title="Play (Enter)">
          Play
        </button>
      </div>
    </div>
  );
}
