import { motion } from 'motion/react';
import { type CSSProperties, useMemo } from 'react';
import type { Persona } from '../engine/ai';
import { type GameState, standings } from '../engine/game';
import { usePhone } from '../hooks';
import { HOST } from '../tutorial';
import { Modal } from './Modals';
import { Avatar } from './Seat';
import { Confetti } from './Tutorial';

const ORDINAL = ['st', 'nd', 'rd', 'th'];
const FLAG_COLORS = ['#d4a24c', '#cf6a3f', '#93b38c', '#f3e9d8', '#b8392a', '#6f8ea3'];

/** Fiesta bunting: two swags of triangular flags hung along quadratic curves. */
function Banderitas() {
  const { path, flags } = useMemo(() => {
    const W = 940;
    const swags = 2;
    const per = 9;
    const top = 3;
    const sag = 30;
    const flags: { x: number; y: number; angle: number; color: string }[] = [];
    let path = `M0 ${top}`;
    for (let s = 0; s < swags; s++) {
      const x0 = (s * W) / swags;
      const x1 = ((s + 1) * W) / swags;
      const cx = (x0 + x1) / 2;
      const cy = top + sag * 2;
      path += ` Q${cx} ${cy} ${x1} ${top}`;
      for (let i = 1; i <= per; i++) {
        const t = i / (per + 1);
        const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1;
        const y = (1 - t) ** 2 * top + 2 * (1 - t) * t * cy + t ** 2 * top;
        const dx = 2 * (1 - t) * (cx - x0) + 2 * t * (x1 - cx);
        const dy = 2 * (1 - t) * (cy - top) + 2 * t * (top - cy);
        flags.push({ x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI, color: FLAG_COLORS[(s * per + i) % FLAG_COLORS.length] });
      }
    }
    return { path, flags };
  }, []);
  return (
    <svg className="banderitas" viewBox="0 0 940 70" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <path d={path} />
      {flags.map((f, i) => (
        <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.angle})`}>
          <polygon className="flag" points="-14,0 14,0 0,26" fill={f.color} style={{ animationDelay: `${-i * 0.37}s` }} />
        </g>
      ))}
    </svg>
  );
}

const CROWN = ['#....#....#', '##..###..##', '###.###.###', '###########', '#*###*###*#', '==========='];

function Crown() {
  return (
    <svg className="pd-crown" viewBox="0 0 11 6" shapeRendering="crispEdges" aria-hidden="true">
      {CROWN.flatMap((row, y) =>
        [...row].map((c, x) =>
          c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={c === '*' ? '#cf6a3f' : c === '=' ? '#9e7330' : '#ebc878'} />,
        ),
      )}
    </svg>
  );
}

interface MatchEndProps {
  open: boolean;
  game: GameState;
  personas: Persona[];
  onAgain: () => void;
  onTitle: () => void;
  onLearn: () => void;
  onTryRebolusyon: () => void;
}

export function MatchEndModal({ open, game, personas, onAgain, onTitle, onLearn, onTryRebolusyon }: MatchEndProps) {
  const phone = usePhone();
  const order = standings(game);
  const youWon = order[0] === 0;
  const podium = [order[1], order[0], order[2]];
  const places = [2, 1, 3];
  const rounds = game.stats.roundWins.reduce((a, b) => a + b, 0);
  const maxShed = Math.max(1, ...game.stats.cardsShed);
  const leads = {
    wins: Math.max(...game.stats.roundWins),
    revs: Math.max(...game.stats.revolutions),
    shed: Math.max(...game.stats.cardsShed),
  };
  const lead = (v: number, best: number) => (v > 0 && v === best ? 'lead' : '');
  const rise = [0.35, 0.6, 0.1];

  return (
    <Modal open={open} wide className="match-end">
      <Banderitas />
      {open && youWon && <Confetti pieces={90} />}
      <header className="me-head">
        <div className="me-eyebrow">
          Final standings · {rounds} round{rounds === 1 ? '' : 's'}
        </div>
        <motion.h2
          className="me-title"
          initial={{ scale: 0.6, opacity: 0, rotate: -3 }}
          animate={{ scale: 1, opacity: 1, rotate: -1.5 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
        >
          {youWon ? 'You rule the table!' : `${personas[order[0]].name} takes the table`}
        </motion.h2>
      </header>

      <div className="me-stage">
        <motion.div className="me-rays" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, duration: 0.9 }} />
        <div className="podium">
          {podium.map((p, i) => {
            const place = places[i];
            return (
              <div key={p} className={`podium-col place-${place}`} style={{ '--persona': personas[p].color } as CSSProperties}>
                <motion.div
                  className="pd-top"
                  initial={{ y: -40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: rise[i] + 0.45, type: 'spring', stiffness: 320, damping: 15 }}
                >
                  <div className="pd-hero">
                    {place === 1 && (
                      <motion.div
                        className="pd-crown-wrap"
                        initial={{ y: -50, rotate: -40, opacity: 0 }}
                        animate={{ y: 0, rotate: -10, opacity: 1 }}
                        transition={{ delay: 1.35, type: 'spring', stiffness: 380, damping: 11 }}
                      >
                        <Crown />
                      </motion.div>
                    )}
                    <Avatar persona={personas[p]} size={(place === 1 ? 88 : 66) * (phone ? 0.75 : 1)} mood={place === 1 ? 'happy' : undefined} />
                  </div>
                  <div className="pd-ribbon">{personas[p].name}</div>
                </motion.div>
                <motion.div
                  className="pd-block"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: rise[i], type: 'spring', stiffness: 170, damping: 17 }}
                >
                  <span className="pd-place">
                    {place}
                    <sup>{ORDINAL[place - 1]}</sup>
                  </span>
                  <span className="pd-score">
                    {game.scores[p] > 0 ? `+${game.scores[p]}` : game.scores[p]}
                    <small>pts</small>
                  </span>
                </motion.div>
              </div>
            );
          })}
        </div>
        <div className="me-floor" />
      </div>

      <div className="me-board" role="table" aria-label="Match stats">
        <div className="mb-row mb-head" role="row">
          <span role="columnheader">#</span>
          <span role="columnheader">Player</span>
          <span role="columnheader" className="num">
            Wins
          </span>
          <span role="columnheader" className="num">
            Revolts
          </span>
          <span role="columnheader">Shed</span>
          <span role="columnheader" className="num">
            Points
          </span>
        </div>
        {order.map((p, rank) => (
          <motion.div
            key={p}
            role="row"
            className={`mb-row place-${rank + 1} ${p === 0 ? 'you' : ''}`}
            style={{ '--persona': personas[p].color } as CSSProperties}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.3 + rank * 0.09 }}
          >
            <span role="cell" className="mb-rank">
              {rank + 1}
            </span>
            <span role="cell" className="mb-who">
              <Avatar persona={personas[p]} size={28} />
              <b>{personas[p].name}</b>
            </span>
            <span role="cell" className={`num ${lead(game.stats.roundWins[p], leads.wins)}`}>
              {game.stats.roundWins[p]}
            </span>
            <span role="cell" className={`num ${lead(game.stats.revolutions[p], leads.revs)}`}>
              {game.stats.revolutions[p]}
            </span>
            <span role="cell" className={`mb-shed ${lead(game.stats.cardsShed[p], leads.shed)}`}>
              <i style={{ width: `${(game.stats.cardsShed[p] / maxShed) * 100}%` }} />
              <em>{game.stats.cardsShed[p]}</em>
            </span>
            <span role="cell" className={`num mb-pts ${game.scores[p] >= 0 ? 'pos' : 'neg'}`}>
              {game.scores[p] > 0 ? `+${game.scores[p]}` : game.scores[p]}
            </span>
          </motion.div>
        ))}
      </div>

      {game.settings.mode === 'klasiko' && (
        <div className="me-next">
          <div>
            <b>Ready for the twists?</b>
            <span>
              <i>Rebolusyon</i> adds table flips, stakes and comebacks. {HOST.name} can walk you through it in 2 minutes.
            </span>
          </div>
          <button className="btn ghost small" onClick={onLearn}>
            Learn it
          </button>
          <button className="btn ghost small" onClick={onTryRebolusyon}>
            Play Rebolusyon
          </button>
        </div>
      )}

      <div className="modal-actions">
        <button className="btn ghost" onClick={onTitle}>
          Back to title
        </button>
        <button className="btn primary" onClick={onAgain} autoFocus>
          Rematch
        </button>
      </div>
    </Modal>
  );
}
