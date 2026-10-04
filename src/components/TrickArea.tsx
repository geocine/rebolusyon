import { AnimatePresence, motion } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { sfx } from '../audio';
import { type Card, RANKS, rankOf } from '../engine/cards';
import { describeCombo, isPowerRank } from '../engine/combos';
import type { Trick } from '../engine/game';
import type { Persona } from '../engine/ai';
import { hasOrigin, rotationOf, takeOrigin } from '../flight';
import { CardView } from './CardView';
import { type Flight, FlyingCard } from './FlyingCard';

const jitter = (c: number, spread: number) => (((c * 2654435761) >>> 0) % 1000) / 1000 * spread - spread / 2;

interface Props {
  trick: Trick;
  revolution: boolean;
  personas: Persona[];
  memoryMode: boolean;
  discard: Card[];
  firstPlay: boolean;
  turn: number;
  playing: boolean;
}

/** Arrow angle toward each seat: you (bottom), left, top, right. */
const SEAT_ANGLE = [180, 270, 0, 90];

export function TrickArea({ trick, revolution, personas, memoryMode, discard, firstPlay, turn, playing }: Props) {
  const plays = trick.plays.filter((p) => p.combo);
  const hideTrick = trick.done && memoryMode;
  const visible = hideTrick ? [] : plays.slice(-3);
  const top = visible[visible.length - 1];
  const topKey = top?.combo?.cards.join('-') ?? '';

  const [flights, setFlights] = useState<Flight[]>([]);
  const [airborne, setAirborne] = useState<Set<Card>>(() => new Set());
  const [impact, setImpact] = useState(0);
  /** Cards that arrived by flight; they skip the flip-in entrance when they settle. */
  const flown = useRef(new Set<Card>());
  const inAir = (c: Card) => airborne.has(c) || hasOrigin(c);

  useLayoutEffect(() => {
    if (!top) flown.current.clear();
    const cards = top?.combo?.cards.filter(hasOrigin) ?? [];
    if (!cards.length) return;
    for (const c of cards) flown.current.add(c);
    const launched: Flight[] = [];
    cards.forEach((c, i) => {
      const from = takeOrigin(c)!;
      const el = document.querySelector<HTMLElement>(`.trick-stage [data-card="${c}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      launched.push({
        card: c,
        from,
        to: { x: r.left + r.width / 2, y: r.top + r.height / 2, width: el.offsetWidth, rotate: rotationOf(el) },
        delay: i * 0.075,
        power: isPowerRank(rankOf(c), revolution),
      });
    });
    setFlights((f) => [...f, ...launched]);
    setAirborne((s) => new Set([...s, ...cards]));
  }, [topKey]);

  const onStage = new Set(visible.flatMap((p) => p.combo!.cards));
  const stranded = flights.some((f) => !onStage.has(f.card));
  useLayoutEffect(() => {
    if (!stranded) return;
    setFlights((f) => f.filter((x) => onStage.has(x.card)));
    setAirborne((s) => new Set([...s].filter((c) => onStage.has(c))));
  });

  const land = (card: Card) => {
    sfx.land();
    if (flights.every((f) => f.card === card)) setImpact((n) => n + 1);
    setFlights((f) => f.filter((x) => x.card !== card));
    setAirborne((s) => {
      const next = new Set(s);
      next.delete(card);
      return next;
    });
  };

  return (
    <div className="trick-area">
      <OrderMeter revolution={revolution} />

      <div className="discard" aria-label={`${discard.length} cards in the discard pile`}>
        {discard.map((c, i) => (
          <CardView
            key={c}
            card={c}
            layoutId={`card-${c}`}
            faceDown
            size="xs"
            className="discard-card"
            style={{ zIndex: i, rotate: jitter(c, 50), x: jitter(c * 7, 18), y: jitter(c * 13, 14) }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          />
        ))}
        {discard.length > 0 && <span className="discard-count">{discard.length}</span>}
      </div>

      <div className="trick-stage">
        {visible.map((p, i) => {
          const depth = visible.length - 1 - i;
          const combo = p.combo!;
          return (
            <motion.div
              key={combo.cards.join('-')}
              className={`trick-play depth-${depth}`}
              animate={{ scale: 1 - depth * 0.16, y: -depth * 34, opacity: depth ? 0.55 : 1, rotate: depth ? jitter(combo.cards[0], 10) : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              style={{ zIndex: 10 - depth }}
            >
              {combo.cards.map((c, j) => {
                const flying = inAir(c);
                return (
                  <CardView
                    key={flying ? `${c}-air` : c}
                    card={c}
                    data-card={c}
                    layoutId={flying ? undefined : `card-${c}`}
                    size="lg"
                    powerCard={isPowerRank(rankOf(c), revolution)}
                    className="trick-card"
                    style={{ zIndex: j, visibility: flying ? 'hidden' : undefined }}
                    initial={flying || flown.current.has(c) ? false : { rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                  />
                );
              })}
            </motion.div>
          );
        })}
        <AnimatePresence>
          {impact > 0 && (
            <motion.span
              key={impact}
              className="trick-impact"
              initial={{ scale: 0.4, opacity: 0.7 }}
              animate={{ scale: 1.6, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        {flights
          .filter((f) => onStage.has(f.card))
          .map((f) => (
            <FlyingCard key={f.card} flight={f} onLand={land} />
          ))}

        <AnimatePresence mode="wait">
          {!top && (
            <motion.div
              key={trick.done ? `lead-${trick.topBy}` : firstPlay ? 'open' : 'empty'}
              className="trick-empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {firstPlay ? (
                <>
                  <span className="big">3♣</span>
                  <span>{turn === 0 ? 'You open the round' : `${personas[turn].name} opens the round`}</span>
                </>
              ) : (
                <>
                  <span className="big">Clear table</span>
                  <span>{turn === 0 ? 'You lead anything' : `${personas[turn].name} leads anything`}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {top && (
          <motion.div
            key={`${top.combo!.cards.join('-')}-${trick.done}`}
            className={`trick-caption ${trick.done ? 'done' : ''}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {trick.done ? (
              <>
                <b style={{ color: personas[trick.topBy].color }}>{personas[trick.topBy].name}</b>
                {trick.topBy === 0 ? ' take it. Lead anything' : ' takes it and leads next'}
              </>
            ) : (
              <>
                <b style={{ color: personas[top.player].color }}>{personas[top.player].name}</b>
                <span className="sep">·</span>
                {describeCombo(top.combo!)}
                {top.flipped && <span className="flip-tag">REBOLUSYON</span>}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {playing && top && !trick.done && (
        <div className="turn-pointer" style={{ ['--persona' as string]: personas[turn].color }} aria-live="polite">
          <motion.svg
            className="tp-arrow"
            viewBox="0 0 24 24"
            aria-hidden="true"
            animate={{ rotate: SEAT_ANGLE[turn] }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <path d="M12 3 20 15h-5v6H9v-6H4z" fill="currentColor" />
          </motion.svg>
          <span>{turn === 0 ? 'Your turn' : `${personas[turn].name}’s turn`}</span>
        </div>
      )}
    </div>
  );
}

function OrderMeter({ revolution }: { revolution: boolean }) {
  const ranks = revolution ? [...RANKS].reverse() : [...RANKS];
  return (
    <div className={`order-meter ${revolution ? 'rev' : ''}`} title="Card order: weakest → strongest">
      <span className="om-label">{revolution ? 'REVERSED' : 'ORDER'}</span>
      <div className="om-ranks">
        {ranks.map((r, i) => (
          <motion.span key={r} layout className={`om-rank ${i === ranks.length - 1 ? 'king' : ''}`} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
            {r}
          </motion.span>
        ))}
      </div>
      <span className="om-arrow">▶</span>
    </div>
  );
}
