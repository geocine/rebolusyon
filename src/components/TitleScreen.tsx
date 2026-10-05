import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { makeCard } from '../engine/cards';
import type { Difficulty, RuleMode } from '../engine/game';
import { MODES, modeOf } from '../mechanics';
import { DIFFICULTIES } from '../difficulty';
import type { LifetimeStats } from '../storage';
import { CardView } from './CardView';
import { Icon } from './Icons';
import { ModePicker } from './Modals';
import { Avatar } from './Seat';
import { HOST } from '../tutorial';

const HERO = [makeCard(0, 0), makeCard(12, 0), makeCard(12, 1), makeCard(12, 2), makeCard(12, 3)];

interface Props {
  stats: LifetimeStats;
  mode: RuleMode;
  klasikoBantay: boolean;
  onMode: (m: RuleMode) => void;
  difficulty: Difficulty;
  onDifficulty: (d: Difficulty) => void;
  onPlay: () => void;
  /** Opens the walkthrough for that mode. */
  onLearn: (course: RuleMode) => void;
  /** Walkthroughs already finished. */
  graduated: RuleMode[];
  onRules: () => void;
  onSettings: () => void;
  fullscreen: { available: boolean; on: boolean; toggle: () => void };
}

const screen = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.25 },
};

/**
 * Every variant of a label laid in the same spot, only the current one visible, so the spot is always
 * as big as its longest variant and switching never nudges the layout.
 */
function Swap<K extends string>({ value, options }: { value: K; options: { key: K; text: string }[] }) {
  return (
    <span className="swap">
      {options.map((o) => (
        <span key={o.key} className={o.key === value ? 'on' : undefined} aria-hidden={o.key !== value}>
          {o.text}
        </span>
      ))}
    </span>
  );
}

function ModeSwitch({ mode, onMode }: { mode: RuleMode; onMode: (m: RuleMode) => void }) {
  return (
    <div className="segmented ts-diff ts-mode" role="radiogroup" aria-label="Mode">
      {MODES.map((m) => (
        <button key={m.value} role="radio" aria-checked={mode === m.value} className={mode === m.value ? 'on' : ''} onClick={() => onMode(m.value)} title={`${m.name} (${m.en})`}>
          {m.name}
        </button>
      ))}
    </div>
  );
}

export function TitleScreen({ stats, mode, klasikoBantay, onMode, difficulty, onDifficulty, onPlay, onLearn, graduated, onRules, onSettings, fullscreen }: Props) {
  const [view, setView] = useState<'home' | 'modes'>('home');
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setFlipped((f) => !f), 3600);
    return () => clearInterval(t);
  }, []);
  const order = flipped ? [...HERO].reverse() : HERO;
  const done = graduated.includes(mode);
  const learnLabel = (m: RuleMode) =>
    graduated.includes(m) ? `Replay the ${modeOf(m).name} walkthrough` : m === 'klasiko' ? 'New? Learn to play' : 'Learn Rebolusyon';
  const learnTitle = (m: RuleMode) =>
    graduated.includes(m) ? `Replay the ${modeOf(m).name} walkthrough` : m === 'klasiko' ? 'New to Pusoy Dos? Learn it first' : 'Learn Rebolusyon first';
  const learnSub = (m: RuleMode) =>
    graduated.includes(m)
      ? `${HOST.name}’s Pusoy School · you graduated ✓`
      : m === 'klasiko'
        ? `3 minutes with ${HOST.name}. Four small hands, every rule.`
        : `2 minutes with ${HOST.name}. You play every twist yourself.`;
  const byMode = (text: (m: RuleMode) => string) => <Swap value={mode} options={MODES.map((m) => ({ key: m.value, text: text(m.value) }))} />;

  return (
    <div className={`title-screen ${flipped ? 'rev' : ''}`}>
      <div className="ts-sunburst" aria-hidden="true" />
      {fullscreen.available && (
        <button
          className="btn ghost small icon-btn ts-fullscreen"
          onClick={fullscreen.toggle}
          title={fullscreen.on ? 'Exit full screen (F)' : 'Full screen (F)'}
          aria-pressed={fullscreen.on}
        >
          <Icon name={fullscreen.on ? 'shrink' : 'expand'} size={16} />
        </button>
      )}
      <AnimatePresence mode="wait" initial={false}>
        {view === 'home' ? (
          <motion.div key="home" className="ts-inner ts-home" {...screen}>
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
              The Filipino take on Big Two. Shed all 13 cards before anyone else.
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
            <div className="hero-caption">
              <Swap
                value={flipped ? 'flip' : 'normal'}
                options={[
                  { key: 'normal', text: 'Normal order: the Twos rule' },
                  { key: 'flip', text: 'In Rebolusyon mode it can flip: the 3♣ is king' },
                ]}
              />
            </div>

            <motion.div className="ts-actions" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
              <button className="btn primary huge" onClick={onPlay}>
                {byMode((m) => `Play ${modeOf(m).name}`)}
              </button>
              <div className="ts-picks">
                <div className="ts-pick">
                  <span className="ts-pick-label">Mode</span>
                  <ModeSwitch mode={mode} onMode={onMode} />
                </div>
                <div className="ts-pick">
                  <span className="ts-pick-label">Opponents</span>
                  <div className="segmented ts-diff">
                    {DIFFICULTIES.map(({ value, label, desc }) => (
                      <button key={value} className={difficulty === value ? 'on' : ''} onClick={() => onDifficulty(value)} title={desc}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="ts-pick-desc">{byMode((m) => modeOf(m).tagline)}</p>
              <div className="ts-links">
                <button className={`btn ghost ${done ? '' : 'ts-link-learn'}`} onClick={() => onLearn(mode)}>
                  {byMode(learnLabel)}
                </button>
                <button className="btn ghost" onClick={() => setView('modes')}>
                  Two ways to play
                </button>
                <button className="btn ghost" onClick={onRules}>
                  How to play
                </button>
                <button className="btn ghost" onClick={onSettings}>
                  Settings
                </button>
              </div>
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
          </motion.div>
        ) : (
          <motion.div key="modes" className="ts-inner ts-modes-view" {...screen}>
            <header className="ts-modes-head">
              <button className="btn ghost small" onClick={() => setView('home')}>
                ← Back
              </button>
              <h2>Two ways to play</h2>
            </header>
            <ul className="ts-basics">
              <li>
                Both modes start the same. Whoever holds <b>3♣</b> opens, and the goal is to shed all 13 cards.
              </li>
              <li>
                Beat the table with the <b>same number of cards</b> (a single, pair, triple or five-card hand), or pass.
              </li>
              <li>
                Twos are high, and ties break by suit: ♣ &lt; ♠ &lt; <span className="r">♥</span> &lt; <span className="r">♦</span>. When
                everyone passes, the last player to play leads anything.
              </li>
            </ul>
            <div className="ts-modes-tabs">
              <ModeSwitch mode={mode} onMode={onMode} />
            </div>
            <ModePicker className="ts-mode-cards" value={mode} klasikoBantay={klasikoBantay} onChange={onMode} />
            <div className="ts-modes-actions">
              <button className={`ts-learn ${done ? 'done' : ''}`} onClick={() => onLearn(mode)}>
                <Avatar persona={HOST} size={34} />
                <span>
                  <b>{byMode(learnTitle)}</b>
                  <small>{byMode(learnSub)}</small>
                </span>
              </button>
              <button className="btn primary" onClick={onPlay}>
                {byMode((m) => `Play ${modeOf(m).name}`)}
              </button>
            </div>
            <p className="ts-modes-foot">
              Combos and scoring in full are in{' '}
              <button type="button" className="link" onClick={onRules}>
                How to play
              </button>
              .<span className="ts-foot-extra"> No peeking: bots only see their own hand, the cards played, and who passed.</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
