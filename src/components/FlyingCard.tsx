import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import type { Card } from '../engine/cards';
import type { Origin } from '../flight';
import { CardView } from './CardView';

export interface Flight {
  card: Card;
  from: Origin;
  to: { x: number; y: number; width: number; rotate: number };
  delay: number;
  power: boolean;
}

/**
 * A two-faced card thrown from a hand to its slot on the table: it lifts toward the viewer on an arc,
 * spins and flips in 3D (a bot's face-down card turns face-up on the way), then slaps down with a
 * small squash. The real table card stays hidden underneath until this lands.
 */
export function FlyingCard({ flight, onLand }: { flight: Flight; onLand: (card: Card) => void }) {
  const { card, from, to, delay, power } = flight;
  const w = to.width;
  const h = w * 1.4;
  const s0 = from.width / w;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  // Throws from the bottom arc high, from the sides a little, from the top barely hop.
  const lift = 28 + 110 * (Math.max(0, -dy) / dist) + 60 * (Math.abs(dx) / dist);
  const peak = Math.max(12 + (h * 1.2) / 2, Math.min(from.y, to.y) - lift);
  const dir = dx === 0 ? 1 : Math.sign(dx);
  const duration = from.faceDown ? 0.78 : 0.72;

  const flip = from.faceDown ? [180, 120, 20, -8, 0] : [0, -150, -320, -366, -360];
  const times = [0, 0.3, 0.62, 0.84, 1];

  return createPortal(
    <motion.div
      className="flyer"
      style={{ width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, ['--cw' as string]: `${w}px` }}
      initial={{ x: from.x, y: from.y }}
      animate={{ x: [from.x, to.x], y: [from.y, Math.min(peak, from.y, to.y), to.y] }}
      transition={{
        x: { duration, delay, ease: [0.3, 0.1, 0.25, 1] },
        y: { duration, delay, times: [0, 0.48, 1], ease: ['easeOut', 'easeIn'] },
      }}
      onAnimationComplete={() => onLand(card)}
    >
      <motion.div
        className="flyer-shadow"
        initial={{ x: 3, y: 5, scale: s0, opacity: 0.4 }}
        animate={{ x: [3, 22 * dir, 30 * dir, 4, 3], y: [5, 34, 40, 6, 4], scale: [s0, 1.05, 1.1, 0.98, 1], opacity: [0.4, 0.22, 0.16, 0.6, 0.38] }}
        transition={{ duration, delay, times }}
      />
      <motion.div
        className="flyer-card"
        initial={{ scale: s0, rotate: from.rotate, rotateY: flip[0], rotateX: 0 }}
        animate={{
          scale: [s0, 1.18, 1.22, 0.93, 1],
          rotate: [from.rotate, from.rotate + 14 * dir, to.rotate - 9 * dir, to.rotate + 2 * dir, to.rotate],
          rotateY: flip,
          rotateX: [0, 26, 18, -7, 0],
        }}
        transition={{ duration, delay, times, ease: 'easeInOut' }}
      >
        <CardView card={card} size="lg" powerCard={power} className="flyer-face" />
        <CardView card={card} size="lg" faceDown className="flyer-face flyer-back" />
      </motion.div>
    </motion.div>,
    document.body,
  );
}
