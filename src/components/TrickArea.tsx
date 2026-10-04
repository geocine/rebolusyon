import { AnimatePresence, motion } from 'motion/react';
import { type Card, RANKS, rankOf } from '../engine/cards';
import { describeCombo, isPowerRank } from '../engine/combos';
import type { Trick } from '../engine/game';
import type { Persona } from '../engine/ai';
import { CardView } from './CardView';

const jitter = (c: number, spread: number) => (((c * 2654435761) >>> 0) % 1000) / 1000 * spread - spread / 2;

interface Props {
  trick: Trick;
  revolution: boolean;
  personas: Persona[];
  memoryMode: boolean;
  discard: Card[];
  firstPlay: boolean;
  turn: number;
}

export function TrickArea({ trick, revolution, personas, memoryMode, discard, firstPlay, turn }: Props) {
  const plays = trick.plays.filter((p) => p.combo);
  const hideTrick = trick.done && memoryMode;
  const visible = hideTrick ? [] : plays.slice(-3);
  const top = visible[visible.length - 1];

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
              {combo.cards.map((c, j) => (
                <CardView
                  key={c}
                  card={c}
                  layoutId={`card-${c}`}
                  size="lg"
                  powerCard={isPowerRank(rankOf(c), revolution)}
                  className="trick-card"
                  style={{ zIndex: j }}
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                />
              ))}
            </motion.div>
          );
        })}

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
                  <span>{personas[turn].name} opens the round</span>
                </>
              ) : (
                <>
                  <span className="big">Malinis</span>
                  <span>{personas[turn].name} leads anything</span>
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
                <b style={{ color: personas[trick.topBy].color }}>{personas[trick.topBy].name}</b> takes it — lead anything
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
    </div>
  );
}

function OrderMeter({ revolution }: { revolution: boolean }) {
  const ranks = revolution ? [...RANKS].reverse() : [...RANKS];
  return (
    <div className={`order-meter ${revolution ? 'rev' : ''}`} title="Card order: weakest → strongest">
      <span className="om-label">{revolution ? 'BALIKTAD' : 'ORDER'}</span>
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
