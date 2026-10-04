import { AnimatePresence, motion } from 'motion/react';
import type { Card } from '../engine/cards';
import type { Persona } from '../engine/ai';
import { MECHANICS } from '../mechanics';
import { CardView } from './CardView';
import { type AvatarMood, PixelAvatar, SPRITES } from './PixelAvatar';

export type SeatPosition = 'left' | 'top' | 'right' | 'bottom';

interface AvatarProps {
  persona: Pick<Persona, 'color' | 'initials'>;
  size?: number;
  active?: boolean;
  talking?: boolean;
  mood?: AvatarMood;
}

export function Avatar({ persona, size = 56, active, talking, mood }: AvatarProps) {
  const pixel = persona.initials in SPRITES;
  return (
    <div
      className={`avatar ${active ? 'active' : ''} ${pixel ? 'pixel' : ''}`}
      style={{ width: size, height: size, ['--persona' as string]: persona.color }}
    >
      {pixel ? (
        <div className="avatar-tile">
          <PixelAvatar id={persona.initials} active={active} talking={talking} mood={mood} />
        </div>
      ) : (
        <span>{persona.initials}</span>
      )}
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

export function PassStamp({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span
          className="pass-stamp"
          initial={{ scale: 2.4, rotate: -32, opacity: 0 }}
          animate={{ scale: 1, rotate: -14, opacity: 1 }}
          exit={{ scale: 0.7, opacity: 0, transition: { duration: 0.18 } }}
          transition={{ type: 'spring', stiffness: 520, damping: 18 }}
        >
          PASS
        </motion.span>
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
  /** Carries the Patong: leads the match, pays double if they lose this round. */
  bounty: boolean;
  /** Alone in last place with Alsa on: their Three of a Kind flips the order. */
  underdog: boolean;
  bubble: string | null;
}

export function BountyChip() {
  return (
    <span className="chip bounty" title={`${MECHANICS.patong.name} (${MECHANICS.patong.en}): ${MECHANICS.patong.desc}`}>
      BOUNTY
    </span>
  );
}

export function UnderdogChip() {
  return (
    <span className="chip underdog" title={`${MECHANICS.alsa.name} (${MECHANICS.alsa.en}): ${MECHANICS.alsa.desc}`}>
      UNDERDOG
    </span>
  );
}

export function Seat({ player, persona, cards, score, position, isTurn, passed, isLeader, bounty, underdog, bubble }: SeatProps) {
  const n = cards.length;
  const vertical = position !== 'top';
  return (
    <div
      className={`seat seat-${position} ${isTurn ? 'is-turn' : ''} ${passed && !isTurn ? 'has-passed' : ''}`}
      data-player={player}
      style={{ ['--persona' as string]: persona.color }}
    >
      <div className="seat-id">
        <div className="seat-avatar-wrap">
          <Avatar persona={persona} active={isTurn} talking={!!bubble} />
          <PassStamp show={passed && !isTurn} />
          <Bubble text={bubble} position={position} />
        </div>
        <div className="seat-meta">
          <div className="seat-name">{persona.name}</div>
          <div className="seat-title">{persona.title}</div>
          <div className="seat-chips">
            <span className={`chip score ${score < 0 ? 'neg' : ''}`}>{score > 0 ? `+${score}` : score}</span>
            {bounty && <BountyChip />}
            {underdog && <UnderdogChip />}
            {isTurn && (
              <span className="chip thinking" title="Thinking">
                <i />
                <i />
                <i />
              </span>
            )}
            {isLeader && !isTurn && <span className="chip lead" title="Their cards are on top">ON TOP</span>}
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
