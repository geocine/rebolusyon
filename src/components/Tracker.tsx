import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef } from 'react';
import { type Card, RANKS, RANK_TWO, makeCard } from '../engine/cards';
import { describeCombo } from '../engine/combos';
import type { LogEntry } from '../engine/game';
import type { Persona } from '../engine/ai';
import { SuitIcon } from './CardView';
import { Term, ordinal } from '../mechanics';

interface Props {
  played: Card[];
  myHand: Card[];
  memoryMode: boolean;
  peeking: boolean;
  peekAvailable: boolean;
  onPeek: () => void;
  log: LogEntry[];
  personas: Persona[];
  revolution: boolean;
  open: boolean;
  onToggle: () => void;
  /** Render as a bottom drawer. */
  phone: boolean;
}

export function Tracker({ played, myHand, memoryMode, peeking, peekAvailable, onPeek, log, personas, revolution, open, onToggle, phone }: Props) {
  const playedSet = new Set(played);
  const mine = new Set(myHand);
  const showGrid = !memoryMode || peeking;
  const powerRank = revolution ? 0 : RANK_TWO;
  const powerOut = [0, 1, 2, 3].filter((s) => {
    const c = makeCard(powerRank, s);
    return !playedSet.has(c) && !mine.has(c);
  }).length;

  return (
    <>
    <AnimatePresence>
      {phone && open && (
        <motion.div className="tracker-scrim" onClick={onToggle} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      )}
    </AnimatePresence>
    <aside className={`tracker ${open ? 'open' : ''} ${phone ? 'as-sheet' : ''}`}>
      <button className="tracker-tab" onClick={onToggle} aria-expanded={open}>
        <span>TRACKER</span>
      </button>
      <div className="tracker-body">
        {phone && <button className="sheet-grabber" onClick={onToggle} aria-label="Close tracker" />}
        <header className="tracker-head">
          <h3>{memoryMode ? <Term m="memory" /> : 'Card Tracker'}</h3>
          <p>{memoryMode ? 'Memory mode is on. Trust your head.' : 'Every card that has been played this round.'}</p>
        </header>

        <div className={`grid-wrap ${showGrid ? '' : 'veiled'}`}>
          <div className="mem-grid" style={{ gridTemplateColumns: `22px repeat(13, 1fr)` }}>
            <span />
            {RANKS.map((r, i) => (
              <span key={r} className={`mg-rank ${i === powerRank ? 'power' : ''}`}>
                {r}
              </span>
            ))}
            {[3, 2, 1, 0].map((s) => (
              <Row key={s} suit={s} playedSet={playedSet} mine={mine} />
            ))}
          </div>
          <AnimatePresence>
            {!showGrid && (
              <motion.div className="veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="veil-eye">◉</span>
                <button className="btn small" disabled={!peekAvailable} onClick={onPeek}>
                  {peekAvailable ? 'Sulyap (Peek): look for 4s' : 'Peek used this round'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {showGrid && (
          <div className="tracker-facts">
            <div>
              <b>{powerOut}</b> {revolution ? 'Threes' : 'Twos'} still out there
            </div>
            <div>
              <b>{52 - played.length - myHand.length}</b> cards in opponents’ hands
            </div>
          </div>
        )}

        <Log log={log} personas={personas} />
      </div>
    </aside>
    </>
  );
}

function Row({ suit, playedSet, mine }: { suit: number; playedSet: Set<Card>; mine: Set<Card> }) {
  return (
    <>
      <SuitIcon suit={suit} className={`mg-suit ${suit >= 2 ? 'red' : ''}`} />
      {RANKS.map((_, r) => {
        const c = makeCard(r, suit);
        const state = playedSet.has(c) ? 'played' : mine.has(c) ? 'mine' : 'out';
        return <span key={r} className={`mg-cell ${state} ${suit >= 2 ? 'red' : ''}`} title={state} />;
      })}
    </>
  );
}

function Log({ log, personas }: { log: LogEntry[]; personas: Persona[] }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [log.length]);
  const who = (p: number) => <b style={{ color: personas[p].color }}>{personas[p].name}</b>;
  const v = (p: number, you: string, them: string) => (p === 0 ? you : them);
  return (
    <ol className="log" ref={ref}>
      {log.map((e) => (
        <li key={e.seq} className={`log-${e.kind}`}>
          {e.kind === 'round' && <span className="log-round">— Round {e.round} —</span>}
          {e.kind === 'play' && (
            <>
              {who(e.player)} {describeCombo(e.combo)}
              {e.flipped && <span className="flip-tag">REBOLUSYON</span>}
            </>
          )}
          {e.kind === 'pass' && (
            <>
              {who(e.player)} {v(e.player, 'pass', 'passes')}
            </>
          )}
          {e.kind === 'clear' && (
            <>
              All passed. {who(e.player)} {v(e.player, 'lead', 'leads')}.
            </>
          )}
          {e.kind === 'win' && (
            <>
              ★ {who(e.player)} {v(e.player, 'go', 'goes')} out!
            </>
          )}
          {e.kind === 'out' &&
            (e.place < 4 ? (
              <>
                ★ {who(e.player)} {v(e.player, 'go', 'goes')} out {ordinal(e.place)}
              </>
            ) : (
              <>
                {who(e.player)} {v(e.player, 'finish', 'finishes')} last
              </>
            ))}
          {e.kind === 'tribute' && (
            <>
              Tribute: {who(e.exchange.from)} ⇄ {who(e.exchange.to)}
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
