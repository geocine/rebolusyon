import { AnimatePresence, motion } from 'motion/react';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { PERSONAS } from '../engine/ai';
import { MECHANICS, Term } from '../mechanics';
import { HOST, LESSONS, STAMPS, type Lesson } from '../tutorial';
import { Avatar } from './Seat';
import { Icon } from './Icons';

/** `**bold**` and `*italic*` in host lines. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) =>
        part.startsWith('**') ? <b key={i}>{part.slice(2, -2)}</b> : part.startsWith('*') ? <i key={i}>{part.slice(1, -1)}</i> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  );
}

/** True while a line of `text` would take to say out loud. */
function useTalking(text: string) {
  const [talking, setTalking] = useState(true);
  useEffect(() => {
    setTalking(true);
    const t = window.setTimeout(() => setTalking(false), Math.min(4500, 500 + text.length * 30));
    return () => clearTimeout(t);
  }, [text]);
  return talking;
}

/** Tita Cora speaking from inside a dialog. */
export function HostNote({ text }: { text: string }) {
  const talking = useTalking(text);
  return (
    <motion.div className="host-note" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
      <Avatar persona={HOST} size={40} active talking={talking} />
      <p>
        <span className="host-name">{HOST.name}</span>
        <Rich text={text} />
      </p>
    </motion.div>
  );
}

interface CoachProps {
  lesson: number;
  step: number;
  text: string;
  /** Present when the step waits for a tap. */
  cta: string | null;
  canShow: boolean;
  onNext: () => void;
  onShow: () => void;
  onRetry: () => void;
  onExit: () => void;
}

export function Coach({ lesson, step, text, cta, canShow, onNext, onShow, onRetry, onExit }: CoachProps) {
  const steps = LESSONS[lesson].steps.length;
  const talking = useTalking(text);
  return (
    <motion.aside className="coach" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 26 }}>
      <div className="coach-host">
        <Avatar persona={HOST} size={44} active talking={talking} />
      </div>
      <div className="coach-body">
        <div className="coach-head">
          <span className="host-name">{HOST.name}</span>
          <span className="coach-steps" aria-label={`Step ${step + 1} of ${steps}`}>
            {Array.from({ length: steps }, (_, i) => (
              <i key={i} className={i < step ? 'done' : i === step ? 'now' : ''} />
            ))}
          </span>
          <span className="coach-tools">
            <button className="coach-icon" onClick={onRetry} title="Restart this lesson" aria-label="Restart this lesson">
              <Icon name="cycle" size={14} />
            </button>
            <button className="coach-icon" onClick={onExit} title="Leave the walkthrough" aria-label="Leave the walkthrough">
              <Icon name="clear" size={14} />
            </button>
          </span>
        </div>
        <AnimatePresence mode="wait">
          <motion.p key={`${lesson}:${step}:${text}`} className="coach-text" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
            <Rich text={text} />
          </motion.p>
        </AnimatePresence>
        {(cta || canShow) && (
          <div className="coach-actions">
            {canShow && (
              <button className="btn ghost small" onClick={onShow}>
                Show me
              </button>
            )}
            {cta && (
              <button className="btn primary small" onClick={onNext} autoFocus>
                {cta}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

const COLORS = ['#d4a24c', '#cf6a3f', '#93b38c', '#c08a96', '#f3e9d8', '#b8392a'];

export function Confetti({ pieces = 70 }: { pieces?: number }) {
  const bits = useMemo(
    () =>
      Array.from({ length: pieces }, (_, i) => ({
        left: Math.random() * 100,
        drift: (Math.random() - 0.5) * 240,
        spin: (Math.random() - 0.5) * 1440,
        delay: Math.random() * 0.5,
        dur: 1.8 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 8,
        round: Math.random() < 0.3,
      })),
    [pieces],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: `${b.left}%`,
            width: b.w,
            height: b.round ? b.w : b.w * 0.45,
            borderRadius: b.round ? '50%' : 2,
            background: b.color,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
            ['--drift' as string]: `${b.drift}px`,
            ['--spin' as string]: `${b.spin}deg`,
          }}
        />
      ))}
    </div>
  );
}

function LessonMap({ current, cleared, onPick }: { current: number; cleared: string[]; onPick: (i: number) => void }) {
  return (
    <div className="tut-map">
      {LESSONS.map((l, i) => (
        <button key={l.id} className={`tut-stop ${i === current ? 'now' : ''} ${cleared.includes(l.id) ? 'done' : ''}`} onClick={() => onPick(i)} title={l.title}>
          <span className="tut-stop-dot">{cleared.includes(l.id) ? '✓' : i + 1}</span>
          <span className="tut-stop-label">{l.short}</span>
        </button>
      ))}
    </div>
  );
}

function Scrim({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={`tut-scrim ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {children}
    </motion.div>
  );
}

const pop = {
  initial: { scale: 0.7, y: 40, opacity: 0, rotate: -3 },
  animate: { scale: 1, y: 0, opacity: 1, rotate: 0 },
  exit: { scale: 0.9, opacity: 0 },
  transition: { type: 'spring' as const, stiffness: 260, damping: 18 },
};

export function LessonIntro({ index, cleared, onStart, onPick, onExit }: { index: number; cleared: string[]; onStart: () => void; onPick: (i: number) => void; onExit: () => void }) {
  const l: Lesson = LESSONS[index];
  return (
    <Scrim>
      <motion.div className="tut-card" {...pop}>
        <button className="modal-x" onClick={onExit} aria-label="Leave the walkthrough">
          ×
        </button>
        <div className="tut-eyebrow">
          {HOST.name}’s Pusoy School · Lesson {index + 1} of {LESSONS.length}
        </div>
        <h2 className="tut-title">{l.title}</h2>
        {l.term && (
          <div className="tut-term">
            <Term m={l.term} />
            <span>{MECHANICS[l.term].desc}</span>
          </div>
        )}
        <p className="tut-tagline">{l.tagline}</p>
        <LessonMap current={index} cleared={cleared} onPick={onPick} />
        <div className="tut-actions">
          {index === 0 && (
            <button className="btn ghost" onClick={() => onPick(1)}>
              I know Pusoy Dos. Skip to the twists
            </button>
          )}
          <button className="btn primary" onClick={onStart} autoFocus>
            {index === 0 ? 'Deal me in' : 'Let’s go'}
          </button>
        </div>
      </motion.div>
    </Scrim>
  );
}

export function LessonClear({ index, onReplay, onNext }: { index: number; onReplay: () => void; onNext: () => void }) {
  const l = LESSONS[index];
  const stamp = STAMPS[index % STAMPS.length];
  const last = index === LESSONS.length - 1;
  return (
    <Scrim className="celebrate">
      <Confetti />
      <motion.div className="tut-pop" {...pop} transition={{ ...pop.transition, delay: 0.5 }}>
        <motion.div
          className="tut-stamp"
          initial={{ scale: 3, rotate: -24, opacity: 0 }}
          animate={{ scale: 1, rotate: -8, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.75 }}
        >
          {stamp.word}
          <small>{stamp.en}</small>
        </motion.div>
        <div className="tut-card clear">
          <div className="tut-eyebrow">
            Lesson {index + 1} cleared · {l.short}
          </div>
          <p className="tut-tagline">{l.clear}</p>
          <div className="tut-actions">
            <button className="btn ghost" onClick={onReplay}>
              Replay
            </button>
            <button className="btn primary" onClick={onNext} autoFocus>
              {last ? 'Graduate' : 'Next lesson'}
            </button>
          </div>
        </div>
      </motion.div>
    </Scrim>
  );
}

export function LessonFail({ winner, onRetry, onExit }: { winner: number; onRetry: () => void; onExit: () => void }) {
  return (
    <Scrim>
      <motion.div className="tut-pop" {...pop}>
        <motion.div className="tut-stamp sad" initial={{ scale: 2.4, rotate: 18, opacity: 0 }} animate={{ scale: 1, rotate: 6, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.2 }}>
          SAYANG!
          <small>So close!</small>
        </motion.div>
        <div className="tut-card fail">
          <p className="tut-tagline">
            {PERSONAS[winner].name} went out first. Happens to the best of us, anak. Try it again, and follow the glowing cards.
          </p>
          <div className="tut-actions">
            <button className="btn ghost" onClick={onExit}>
              Leave
            </button>
            <button className="btn primary" onClick={onRetry} autoFocus>
              Try again
            </button>
          </div>
        </div>
      </motion.div>
    </Scrim>
  );
}

const SIGNATURES = [
  { seat: 1, quote: 'Very good, apo. Now go easy on Lola.' },
  { seat: 2, quote: 'Rematch, pare. Right now.' },
  { seat: 3, quote: 'Noted. I’ll be counting your Twos.' },
];

export function Diploma({ onPlay, onTitle }: { onPlay: () => void; onTitle: () => void }) {
  return (
    <Scrim className="celebrate">
      <Confetti pieces={110} />
      <motion.div className="dp-wrap" initial={{ y: 80, rotate: 4, opacity: 0 }} animate={{ y: 0, rotate: -1, opacity: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.3 }}>
        <motion.div className="dp-seal" initial={{ scale: 2.6, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: -12, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 12, delay: 1.1 }}>
          PASADO
          <small>Passed</small>
        </motion.div>
        <div className="diploma">
          <div className="dp-school">{HOST.name}’s Pusoy School</div>
          <div className="dp-certifies">This certifies that</div>
          <div className="dp-name">You</div>
          <div className="dp-certifies">are now a certified</div>
          <div className="dp-title">
            Rebolusyonaryo
            <small>(Revolutionary)</small>
          </div>
          <div className="dp-learned">
            {(['revolution', 'bantay', 'buwis'] as const).map((m) => (
              <span key={m} className="dp-chip">
                <Term m={m} />
              </span>
            ))}
            <span className="dp-chip">Grand Finish</span>
          </div>
          <div className="dp-sigs">
            {SIGNATURES.map(({ seat, quote }) => (
              <div key={seat} className="dp-sig">
                <Avatar persona={PERSONAS[seat]} size={34} mood="happy" />
                <div>
                  <div className="dp-sig-name" style={{ color: PERSONAS[seat].color }}>
                    {PERSONAS[seat].name}
                  </div>
                  <div className="dp-sig-quote">“{quote}”</div>
                </div>
              </div>
            ))}
          </div>
          <p className="dp-extra">
            Real matches in <b>Rebolusyon</b> mode raise the stakes: the leader carries a <Term m="patong" /> and the final round
            counts double, so no lead is safe. Want it harder? Turn on <Term m="memory" /> in Settings: no tracker, count the cards
            yourself.
          </p>
          <div className="tut-actions">
            <button className="btn ghost" onClick={onTitle}>
              Back to title
            </button>
            <button className="btn primary" onClick={onPlay} autoFocus>
              Play a real match
            </button>
          </div>
        </div>
      </motion.div>
    </Scrim>
  );
}
