import { motion, type HTMLMotionProps } from 'motion/react';
import { memo } from 'react';
import { type Card, RANKS, isRedSuit, rankOf, suitOf } from '../engine/cards';
import { CourtArt } from './CourtArt';

export function SuitIcon({ suit, className }: { suit: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      {suit === 0 && (
        <g fill="currentColor">
          <circle cx="12" cy="6.6" r="4.6" />
          <circle cx="6.4" cy="13.6" r="4.6" />
          <circle cx="17.6" cy="13.6" r="4.6" />
          <circle cx="12" cy="12" r="3" />
          <path d="M12 12.5C12 17 10.6 20.4 8 22.5h8c-2.6-2.1-4-5.5-4-10z" />
        </g>
      )}
      {suit === 1 && (
        <path
          fill="currentColor"
          d="M12 1.5S22.5 8.5 22.5 14c0 3-2.5 5-5.2 5-2 0-3.7-1-4.5-2.4.3 2.4 1.2 4.4 3.2 5.9H8c2-1.5 2.9-3.5 3.2-5.9C10.4 18 8.7 19 6.7 19 4 19 1.5 17 1.5 14 1.5 8.5 12 1.5 12 1.5z"
        />
      )}
      {suit === 2 && (
        <path
          fill="currentColor"
          d="M12 21.5S1.5 14.5 1.5 8.25C1.5 5 4 2.5 7 2.5c2.2 0 4 1.3 5 3.1 1-1.8 2.8-3.1 5-3.1 3 0 5.5 2.5 5.5 5.75C22.5 14.5 12 21.5 12 21.5z"
        />
      )}
      {suit === 3 && <path fill="currentColor" d="M12 1.5Q15 8.5 20.5 12 15 15.5 12 22.5 9 15.5 3.5 12 9 8.5 12 1.5z" />}
    </svg>
  );
}

export type CardSize = 'xl' | 'lg' | 'md' | 'sm' | 'xs';

type MotionDivProps = Omit<HTMLMotionProps<'div'>, 'children'>;

export interface CardViewProps extends MotionDivProps {
  card: Card;
  faceDown?: boolean;
  size?: CardSize;
  selected?: boolean;
  dim?: boolean;
  /** Strongest rank under the current order — gets the gold foil treatment. */
  powerCard?: boolean;
  fresh?: boolean;
  hint?: boolean;
}

const COURT: Record<string, string> = { J: 'J', Q: 'Q', K: 'K' };

function Face({ card, size }: { card: Card; size: CardSize }) {
  const rank = RANKS[rankOf(card)];
  const suit = suitOf(card);
  const compact = size === 'xs' || size === 'sm';
  return (
    <>
      <div className="idx tl">
        <span className="idx-rank">{rank}</span>
        <SuitIcon suit={suit} className="idx-suit" />
      </div>
      {!compact && (
        <div className="idx br">
          <span className="idx-rank">{rank}</span>
          <SuitIcon suit={suit} className="idx-suit" />
        </div>
      )}
      <div className={`pip pip-${rank === '10' ? 'ten' : rank.toLowerCase()}`}>
        {compact ? (
          <SuitIcon suit={suit} className="pip-suit" />
        ) : COURT[rank] ? (
          <div className="court">
            <CourtArt rank={rank as 'J' | 'Q' | 'K'} />
            <SuitIcon suit={suit} className="court-suit" />
          </div>
        ) : rank === 'A' ? (
          <div className="ace">
            <SuitIcon suit={suit} className="pip-suit" />
          </div>
        ) : rank === '2' ? (
          <div className="dos">
            <span className="dos-word">DOS</span>
            <SuitIcon suit={suit} className="pip-suit" />
          </div>
        ) : (
          <SuitIcon suit={suit} className="pip-suit" />
        )}
      </div>
    </>
  );
}

export const CardView = memo(function CardView({
  card,
  faceDown,
  size = 'md',
  selected,
  dim,
  powerCard,
  fresh,
  hint,
  className = '',
  ...rest
}: CardViewProps) {
  const red = isRedSuit(suitOf(card));
  const classes = [
    'card',
    `card-${size}`,
    faceDown ? 'back' : 'face',
    !faceDown && (red ? 'red' : 'black'),
    selected && 'selected',
    dim && 'dim',
    powerCard && !faceDown && 'power',
    fresh && 'fresh',
    hint && 'hinted',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <motion.div className={classes} {...rest}>
      {faceDown ? (
        <div className="back-inner">
          <span className="back-mark">2</span>
        </div>
      ) : (
        <>
          <Face card={card} size={size} />
          {powerCard && <span className="power-tab" aria-hidden="true" />}
        </>
      )}
    </motion.div>
  );
});
