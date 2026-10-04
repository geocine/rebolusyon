import { AnimatePresence, motion } from 'motion/react';
import type { Card } from '../engine/cards';
import type { Persona } from '../engine/ai';
import { CardView } from './CardView';

export type SeatPosition = 'left' | 'top' | 'right' | 'bottom';

export function Avatar({ persona, size = 56, active }: { persona: Pick<Persona, 'color' | 'initials'>; size?: number; active?: boolean }) {
  return (
    <div
      className={`avatar ${active ? 'active' : ''}`}
      style={{ width: size, height: size, ['--persona' as string]: persona.color }}
    >
      <span>{persona.initials}</span>
    </div>
  );
}

export function Bubble({ text, position }: { text: string | null; position: SeatPosition }) {
  return (
    <AnimatePresence>
      {text && (
        <motion.div
          key={text}
          className={`bubble bubble-${position}`}
          initial={{ opacity: 0, scale: 0.6, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface SeatProps {
  player: number;
  persona: Persona;
  cards: Card[];
  score: number;
  position: SeatPosition;
  isTurn: boolean;
  passed: boolean;
  isLeader: boolean;
  bubble: string | null;
}

export function Seat({ player, persona, cards, score, position, isTurn, passed, isLeader, bubble }: SeatProps) {
  const n = cards.length;
  const vertical = position !== 'top';
  return (
    <div className={`seat seat-${position} ${isTurn ? 'is-turn' : ''}`} data-player={player}>
      <div className="seat-id">
        <div className="seat-avatar-wrap">
          <Avatar persona={persona} active={isTurn} />
          <Bubble text={bubble} position={position} />
        </div>
        <div className="seat-meta">
          <div className="seat-name">{persona.name}</div>
          <div className="seat-title">{persona.title}</div>
          <div className="seat-chips">
            <span className={`chip score ${score < 0 ? 'neg' : ''}`}>{score > 0 ? `+${score}` : score}</span>
            {isTurn && (
              <span className="chip thinking">
                <i />
                <i />
                <i />
              </span>
            )}
            {passed && !isTurn && <span className="chip pass">PASS</span>}
            {isLeader && !isTurn && !passed && <span className="chip lead">TOP</span>}
          </div>
        </div>
      </div>
      <div className={`seat-fan ${vertical ? 'vertical' : ''}`}>
        {cards.map((c, i) => (
          <CardView
            key={c}
            card={c}
            layoutId={`card-${c}`}
            faceDown
            size="xs"
            className="fan-card"
            style={{ zIndex: i }}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30, delay: 0 }}
          />
        ))}
        <div className={`count-badge ${n <= 2 ? 'danger' : ''} ${n === 1 ? 'last' : ''}`}>{n}</div>
      </div>
    </div>
  );
}
