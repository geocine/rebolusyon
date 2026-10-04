import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { makeCard } from '../engine/cards';
import type { Difficulty, RuleMode } from '../engine/game';
import { MODES, modeOf } from '../mechanics';
import { PERSONAS } from '../engine/ai';
import { DIFFICULTIES } from '../difficulty';
import type { LifetimeStats } from '../storage';
import { CardView } from './CardView';
import { Avatar } from './Seat';
import { HOST } from '../tutorial';

const HERO = [makeCard(0, 0), makeCard(12, 0), makeCard(12, 1), makeCard(12, 2), makeCard(12, 3)];

interface Props {
  stats: LifetimeStats;
  mode: RuleMode;
  onMode: (m: RuleMode) => void;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onPlay: () => void;
  onLearn: () => void;
  graduated: boolean;
  onRules: () => void;
  onSettings: () => void;
}

export function TitleScreen({ stats, mode, onMode, difficulty, onDifficulty, onPlay, onLearn, graduated, onRules, onSettings }: Props) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setFlipped((f) => !f), 3600);
    return () => clearInterval(t);
  }, []);
  const order = flipped ? [...HERO].reverse() : HERO;

  return (
    <div className={`title-screen ${flipped ? 'rev' : ''}`}>
      <div className="ts-sunburst" aria-hidden="true" />
      <div className="ts-inner">
        <motion.div className="ts-eyebrow" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          A Pusoy Dos game
        </motion.div>
        <motion.h1
          className="logo"
          initial={{ opacity: 0, scale: 1.3, rotate: -4 }}
          animate={{ opacity: 1, scale: 1, rotate: -2 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.2 }}
        >
          REBOLUSYON
        </motion.h1>
        <motion.p className="ts-tag" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          The Filipino take on Big Two, with a few house twists. Shed your cards. Guard the last one. Flip the order.
        </motion.p>

        <div className="hero-fan">
          {order.map((c, i) => (
            <CardView
              key={c}
              card={c}
              layout
              size="xl"
              powerCard={flipped ? c === HERO[0] : c !== HERO[0]}
              className={`hero-card ${flipped && c === HERO[0] ? 'crowned' : ''}`}
              initial={{ y: 200, opacity: 0, rotate: 0 }}
              animate={{ y: Math.abs(i - 2) * 14, opacity: 1, rotate: (i - 2) * 9 }}
              whileHover={{ y: -24, rotate: (i - 2) * 6, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              transition={{ type: 'spring', stiffness: 160, damping: 18, delay: 0.3 + i * 0.07 }}
            />
          ))}
        </div>
        <div className="hero-caption">{flipped ? 'Rebolusyon (Revolution): the 3♣ is king' : 'Normal order: the Twos rule'}</div>

        <motion.div className="ts-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <button className={`ts-learn ${graduated ? 'done' : ''}`} onClick={onLearn}>
            <Avatar persona={HOST} size={34} />
            <span>
              <b>{graduated ? 'Replay the walkthrough' : 'New here? Learn the twists'}</b>
              <small>{graduated ? `${HOST.name}’s Pusoy School · you graduated ✓` : `2 minutes with ${HOST.name}. You play every twist yourself.`}</small>
            </span>
          </button>
          <button className="btn primary huge" onClick={onPlay}>
            Play
          </button>
          <div className="ts-secondary">
            <button className="btn ghost" onClick={onRules}>
              How to play
            </button>
            <button className="btn ghost" onClick={onSettings}>
              Settings
            </button>
          </div>
          <span className="ts-pick-label">Rules</span>
          <div className="segmented ts-diff ts-mode" role="radiogroup" aria-label="Rules">
            {MODES.map((m) => (
              <button key={m.value} role="radio" aria-checked={mode === m.value} className={mode === m.value ? 'on' : ''} onClick={() => onMode(m.value)} title={`${m.name} (${m.en})`}>
                {m.name}
              </button>
            ))}
          </div>
          <p className="ts-diff-desc">{modeOf(mode).tagline}</p>
          <span className="ts-pick-label">Opponents</span>
          <div className="segmented ts-diff">
            {DIFFICULTIES.map(({ value, label }) => (
              <button key={value} className={difficulty === value ? 'on' : ''} onClick={() => onDifficulty(value)}>
                {label}
              </button>
            ))}
          </div>
          <p className="ts-diff-desc">{DIFFICULTIES.find((d) => d.value === difficulty)?.desc}</p>
          <p className="ts-fair">No peeking: bots only see their own hand, the cards played, and who passed. Same as you.</p>
        </motion.div>

        <motion.div className="roster" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          {PERSONAS.slice(1).map((p) => (
            <div key={p.name} className="roster-card" style={{ ['--persona' as string]: p.color }}>
              <Avatar persona={p} size={48} />
              <div>
                <div className="rc-name">{p.name}</div>
                <div className="rc-title">{p.title}</div>
                <div className="rc-blurb">{p.blurb}</div>
              </div>
            </div>
          ))}
        </motion.div>

        {stats.matches > 0 && (
          <div className="ts-stats">
            <span>
              <b>{stats.matches}</b> matches
            </span>
            <span>
              <b>{stats.matchWins}</b> won
            </span>
            <span>
              <b>{stats.roundWins}</b>/{stats.rounds} rounds
            </span>
            <span>
              <b>{stats.revolutions}</b> revolutions
            </span>
            {stats.bestMatchScore !== null && (
              <span>
                best <b>{stats.bestMatchScore}</b>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
