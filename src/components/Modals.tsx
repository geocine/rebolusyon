import { AnimatePresence, type PanInfo, motion, useDragControls } from 'motion/react';
import { type ReactNode, useState } from 'react';
import { type Card, makeCard, rankOf } from '../engine/cards';
import { describeCombo, isPowerRank } from '../engine/combos';
import type { Exchange, GameState, RoundResult, RuleMode, Settings } from '../engine/game';
import { bountySeat, isHulingHirit, pickTributePayer, withMode } from '../engine/game';
import type { Persona } from '../engine/ai';
import { CardView } from './CardView';
import { Avatar } from './Seat';
import { MECHANICS, MODES, Term, groupsOf, placeLabel, placePointsText } from '../mechanics';
import { usePhone } from '../hooks';
import { DIFFICULTIES } from '../difficulty';
import { HostNote } from './Tutorial';

export function Modal({ open, onClose, children, wide, className = '' }: { open: boolean; onClose?: () => void; children: ReactNode; wide?: boolean; className?: string }) {
  const phone = usePhone();
  const drag = useDragControls();
  const motionProps = phone
    ? {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'spring' as const, stiffness: 380, damping: 38 },
        drag: onClose ? ('y' as const) : false,
        dragListener: false,
        dragControls: drag,
        dragConstraints: { top: 0, bottom: 0 },
        dragElastic: { top: 0, bottom: 0.7 },
        onDragEnd: (_: unknown, info: PanInfo) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose?.();
        },
      }
    : {
        initial: { y: 40, scale: 0.94, opacity: 0 },
        animate: { y: 0, scale: 1, opacity: 1 },
        exit: { y: 20, scale: 0.97, opacity: 0 },
        transition: { type: 'spring' as const, stiffness: 320, damping: 28 },
      };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className={`modal-scrim ${phone ? 'as-sheet' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div
            className={`modal ${wide ? 'wide' : ''} ${className}`}
            {...motionProps}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {phone && <div className="sheet-grabber" onPointerDown={(e) => onClose && drag.start(e)} />}
            {onClose && (
              <button className="modal-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const mini = (cards: Card[], rev = false) => (
  <span className="mini-row">
    {cards.map((c) => (
      <CardView key={c} card={c} size="sm" powerCard={isPowerRank(rankOf(c), rev)} />
    ))}
  </span>
);

/* ---------------------------------- Rules --------------------------------- */

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} wide className="rules">
      <h2 className="modal-title">How to Play</h2>
      <p className="lede">
        Pusoy Dos is the Filipino take on Big Two: be the first to shed all 13 cards. There are two ways to play.{' '}
        <b>Rebolusyon</b> ends the round as soon as someone goes out, makes everyone else pay for the cards they’re
        holding, and adds the house twists below. <b>Klasiko</b> is the straight game: every round is played out from
        1st place to last.
      </p>

      <div className="rules-grid">
        <section>
          <h4>The order</h4>
          <p>Ranks run low to high. The Two is king:</p>
          <div className="rank-strip">3 4 5 6 7 8 9 10 J Q K A <b>2</b></div>
          <p>Ties on rank break by suit, Filipino style:</p>
          <div className="suit-strip">♣ &lt; ♠ &lt; <span className="r">♥</span> &lt; <span className="r">♦</span></div>
          {mini([makeCard(0, 0), makeCard(12, 3)])}
          <p className="small">3♣ is the weakest card in the deck. 2♦ is the strongest.</p>
        </section>

        <section>
          <h4>Combinations</h4>
          <ul className="combos">
            <li><b>Single</b> · <b>Pair</b> · <b>Triple</b></li>
            <li>
              <b>Five-card hands</b>, weakest to strongest:
              <ol>
                <li>Straight <span className="small">(2s can’t be in straights)</span></li>
                <li>Flush <span className="small">(compared by suit, then high card)</span></li>
                <li>Full House</li>
                <li>Four of a Kind + any kicker</li>
                <li>Straight Flush</li>
              </ol>
            </li>
          </ul>
        </section>

        <section>
          <h4>A trick</h4>
          <p>Whoever holds <b>3♣</b> opens, and their first play has to include it.</p>
          <p>
            Going around, each player plays the <b>same number of cards</b>, and it has to <b>beat</b> what’s on the
            table, or they pass. Passing doesn’t lock you out: you can play again when it comes back around.
          </p>
          <p>Once everyone else has passed, the table clears and the last player to play leads anything.</p>
        </section>

        <section className="twist">
          <h4>
            <span className="tw-tag sage">REBOLUSYON · OPTIONAL IN KLASIKO</span> <Term m="bantay" />
          </h4>
          <p>
            If the player <b>after you</b> is down to one card, any single you play must be your <b>strongest</b>. No feeding them
            a 4♣ to go out on.
          </p>
          <p>Klasiko plays without it by default. It’s a common house rule, so you can switch it on in Settings.</p>
        </section>

        <section className="twist">
          <h4>
            <span className="tw-tag clay">REBOLUSYON · FLIP</span> <Term m="revolution" />
          </h4>
          <p>
            Play <b>Four of a Kind</b> and the world flips. Within every combo type, <b>lower beats higher</b>. 3♣ becomes the
            strongest card and 2♦ the weakest. Another Four of a Kind flips it back. The five-card ladder (Straight → Straight
            Flush) never flips.
          </p>
          <p className="small">Order resets every round. A hand full of low junk can become a monster.</p>
        </section>

        <section className="twist">
          <h4>
            <span className="tw-tag clay">REBOLUSYON · FLIP</span> <Term m="resbak" />
          </h4>
          <p>
            Whoever is <b>alone in last place</b> wears the Underdog tag, and their <b>Three of a Kind</b> starts a Rebolusyon,
            just like Four of a Kind does for everyone else. Sitting on low junk? Time for payback.
          </p>
        </section>

        <section className="twist">
          <h4>
            <span className="tw-tag gold">REBOLUSYON · STAKES</span> <Term m="buwis" />
          </h4>
          <p>
            Before each new round, the biggest loser of the last one pays a tax: their <b>best card</b> goes straight to the
            winner, and the winner sends back <b>any card they choose</b>. Winning snowballs, so the next two rules push back.
          </p>
        </section>

        <section className="twist">
          <h4>
            <span className="tw-tag gold">REBOLUSYON · STAKES</span> <Term m="patong" />
          </h4>
          <p>
            Whoever leads the match wears a <b>bounty</b>. If anyone else wins the round, the leader’s penalty is{' '}
            <b>doubled</b> and the winner collects it. Leads are earned, never safe.
          </p>
        </section>

        <section className="twist">
          <h4>
            <span className="tw-tag gold">REBOLUSYON · STAKES</span> <Term m="hirit" />
          </h4>
          <p>
            The <b>final round counts double</b>. Every penalty is ×2, so whoever is behind always has one big swing left.
          </p>
        </section>

        <section className="twist">
          <h4>
            <span className="tw-tag ink">CHALLENGE</span> <Term m="memory" />
          </h4>
          <p>
            Memory mode for real players. The card tracker is hidden and cleared tricks go face-down. You get one{' '}
            <b>Sulyap</b> (peek) per round: a 4-second look at the tracker. Count the Twos yourself.
          </p>
        </section>

        <section className="twist">
          <h4>
            <span className="tw-tag sage">KLASIKO</span> Play it out
          </h4>
          <p>
            Going out first doesn’t end the round. Finished players sit out while the rest keep playing for <b>2nd</b> and{' '}
            <b>3rd</b>. Whoever is left holding cards is the <b>Talo</b> (loser). If the player who went out was on top and
            everyone passes, the next player still in the round leads.
          </p>
          <p>Each place scores: {placePointsText}. No multipliers, no twists. Every round is worth the same.</p>
        </section>

        <section>
          <h4>Scoring in Rebolusyon</h4>
          <p>Each loser pays <b>1 point per card</b> left, multiplied:</p>
          <ul className="mults">
            <li><b>×2</b> with 10–12 cards left</li>
            <li><b>×3</b> if you never played (13)</li>
            <li><b>×2</b> if caught holding any Two</li>
            <li><b>×2</b> for the match leader if they lose the round (<i>Patong</i>)</li>
            <li><b>×2</b> for everyone in the final round (<i>Huling Hirit</i>)</li>
            <li><b>×2</b> for everyone if the winner goes out on Four of a Kind or a Straight Flush (<i>Grand Finish</i>)</li>
          </ul>
          <p>The winner collects it all. Highest total after the last round wins the match.</p>
        </section>

        <section>
          <h4>Controls</h4>
          <ul className="keys">
            <li><kbd>Click</kbd> select cards</li>
            <li><kbd>Enter</kbd> play</li>
            <li><kbd>Space</kbd> pass</li>
            <li><kbd>Tab</kbd> cycle playable combos</li>
            <li><kbd>H</kbd> hint · <kbd>S</kbd> sort · <kbd>Esc</kbd> clear</li>
            <li>On phones: tap or slide across cards to pick, swipe up to play</li>
          </ul>
        </section>

        <section>
          <h4>How the bots think</h4>
          <p>
            On Sharp and up, each bot imagines dozens to hundreds of ways the hidden cards could be spread, plays every
            promising move out to the end in its head, and goes with what wins most. It only “knows” what a real
            player could: the cards it remembers and what your passes give away. Pass while holding one card, and
            the sharpest reader at the table now knows that card can’t beat it.
          </p>
          <p>
            They don’t always play their biggest cards. About a quarter of the time a bot could beat the table, it
            passes on purpose, usually to keep a Two for later. Beat them the same way: make them spend their Twos
            on cheap singles, lead pairs or five-card hands when someone is short on cards, and watch the card counts.
          </p>
          <p className="small">
            A different three sit down each match, in random seats, and each has a temperament: some hoard their Twos,
            some hunt the leader, some read your passes. Hover a name at the table to see their habit. When a bot says it likes its chances, it’s reading its
            own estimate. The Hint button uses the same brain and shows your odds.
          </p>
        </section>

        <section className="glossary">
          <h4>Table talk</h4>
          <p className="small">Filipino words you’ll hear around the table.</p>
          <dl>
            <dt>Dos</dt>
            <dd>two, the top card (hence Pusoy <i>Dos</i>)</dd>
            <dt>Pass muna</dt>
            <dd>“I’ll pass for now”</dd>
            <dt>Pare</dt>
            <dd>buddy, mate</dd>
            <dt>Lola · Kuya · Ate · Tito · Mang</dt>
            <dd>grandma · big brother · big sister · uncle · mister (older man)</dd>
            <dt>Sari-sari · Suki · Utang</dt>
            <dd>corner shop · regular customer · debt</dd>
            <dt>Talo</dt>
            <dd>loser; in Klasiko, the one left holding cards</dd>
            <dt>Anak · Apo · Iho</dt>
            <dd>child · grandchild · son (said with affection; <i>mga</i> makes it plural)</dd>
            <dt>Sorry na lang</dt>
            <dd>“too bad for you”</dd>
            <dt>Taho</dt>
            <dd>sweet tofu snack sold on the street</dd>
            <dt>Panalo</dt>
            <dd>win!</dd>
            <dt>Grabe · Hay naku · Ay</dt>
            <dd>wow · oh, dear · oh!</dd>
            <dt>Swerte</dt>
            <dd>lucky</dd>
          </dl>
        </section>
      </div>
    </Modal>
  );
}

/* -------------------------------- Settings -------------------------------- */

function Toggle({ label, desc, value, onChange }: { label: ReactNode; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <div>
        <div className="t-label">{label}</div>
        <div className="t-desc">{desc}</div>
      </div>
      <button type="button" role="switch" aria-checked={value} className={`switch ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
        <i />
      </button>
    </label>
  );
}

function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={String(o.value)} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ModePicker({ value, klasikoBantay, onChange, className = '' }: { value: RuleMode; klasikoBantay: boolean; onChange: (m: RuleMode) => void; className?: string }) {
  return (
    <div className={`mode-picker ${className}`} role="radiogroup" aria-label="Mode">
      {MODES.map((m) => {
        const on = value === m.value;
        const mid = (m.hero.length - 1) / 2;
        return (
          <motion.button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={`mode-card mode-${m.value} ${on ? 'on' : ''}`}
            onClick={() => onChange(m.value)}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="mc-art" aria-hidden="true">
              {m.hero.map((c, i) => (
                <CardView
                  key={c}
                  card={c}
                  size="md"
                  powerCard={c === m.crown}
                  className="mc-card"
                  style={{ zIndex: 5 - Math.abs(i - mid) }}
                  initial={false}
                  animate={{ x: (i - mid) * (on ? 22 : 14), y: (on ? -6 : 8) + Math.abs(i - mid) * 7, rotate: (i - mid) * (on ? 15 : 8) }}
                  transition={{ type: 'spring', stiffness: 280, damping: 20 }}
                />
              ))}
              <AnimatePresence>
                {on && (
                  <motion.span
                    className="mc-stamp"
                    initial={{ scale: 1.8, opacity: 0, rotate: -24 }}
                    animate={{ scale: 1, opacity: 1, rotate: -9 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 18 }}
                  >
                    Playing
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <span className="mc-body">
              <span className="mc-head">
                <b>{m.name}</b>
                <span className="mc-en">{m.en}</span>
                <span className="mc-badge">{m.badge}</span>
              </span>
              <span className="mc-tag">{m.tagline}</span>
              <span className="mc-groups">
                {groupsOf(m, klasikoBantay).map((g) => (
                  <span key={g.title} className={`mc-group tone-${g.tone} ${g.off ? 'off' : ''}`}>
                    <i>{g.title}</i>
                    <span className="mc-rules">
                      {g.off && <span className="mc-rule none">{g.off}</span>}
                      {g.rules.map((r) => (
                        <span key={r.m ?? r.name} className="mc-rule">
                          <b>{r.m ? MECHANICS[r.m].name : r.name}</b>
                          {r.m && <span className="mc-gloss">{MECHANICS[r.m].en}</span>} {r.text}
                        </span>
                      ))}
                    </span>
                  </span>
                ))}
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function SettingsModal({ open, onClose, settings, onChange, inMatch }: { open: boolean; onClose: () => void; settings: Settings; onChange: (s: Settings) => void; inMatch: boolean }) {
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => onChange({ ...settings, [k]: v });
  return (
    <Modal open={open} onClose={onClose} className="settings">
      <h2 className="modal-title">Settings</h2>
      {inMatch && <p className="note">Changing the mode or house rule restarts the match. A new round count starts next match. Everything else applies right away.</p>}

      <h4 className="section-label">Mode</h4>
      <ModePicker value={settings.mode} klasikoBantay={settings.klasikoBantay} onChange={(m) => onChange(withMode(settings, m))} />
      {settings.mode === 'klasiko' && (
        <Toggle
          label={
            <>
              House rule: <Term m="bantay" />
            </>
          }
          desc="Many tables play it: if the next player has one card left, any single you play must be your strongest."
          value={settings.klasikoBantay}
          onChange={(v) => onChange(withMode({ ...settings, klasikoBantay: v }))}
        />
      )}

      <h4 className="section-label">Challenge</h4>
      <Toggle label={<Term m="memory" />} desc="Hide the card tracker. One 4-second peek per round." value={settings.memoryMode} onChange={(v) => set('memoryMode', v)} />

      <h4 className="section-label">Table</h4>
      <div className="row">
        <span>Opponents</span>
        <Segmented value={settings.difficulty} options={DIFFICULTIES} onChange={(v) => set('difficulty', v)} />
      </div>
      <p className="row-desc">{DIFFICULTIES.find((d) => d.value === settings.difficulty)?.desc}</p>
      <div className="row">
        <span>Rounds</span>
        <Segmented value={settings.rounds} options={[3, 6, 10].map((n) => ({ value: n, label: String(n) }))} onChange={(v) => set('rounds', v)} />
      </div>
      <div className="row">
        <span>Pace</span>
        <Segmented
          value={settings.speed}
          options={[
            { value: 'chill', label: 'Slow' },
            { value: 'normal', label: 'Normal' },
            { value: 'fast', label: 'Fast' },
          ]}
          onChange={(v) => set('speed', v)}
        />
      </div>
      <Toggle
        label="Auto-pass"
        desc="When nothing in your hand beats the table, pass for you after a 5-second countdown."
        value={settings.autoPass}
        onChange={(v) => set('autoPass', v)}
      />
      <Toggle label="Sound" desc="Synthesized table sounds." value={settings.sound} onChange={(v) => set('sound', v)} />
      <Toggle label="Vibration" desc="Haptic taps on supported phones." value={settings.haptics} onChange={(v) => set('haptics', v)} />
    </Modal>
  );
}

/* -------------------------------- Exchange -------------------------------- */

export function ExchangeModal({ exchange, hand, personas, onReturn, host }: { exchange: Exchange | null; hand: Card[]; personas: Persona[]; onReturn: (c: Card) => void; host?: string | null }) {
  const [pick, setPick] = useState<Card | null>(null);
  const open = !!exchange && exchange.to === 0 && exchange.returned === null;
  return (
    <Modal open={open} wide className="exchange">
      {exchange && (
        <>
          {host && <HostNote text={host} />}
          <h2 className="modal-title">
            <Term m="buwis" />
          </h2>
          <p className="lede">
            <b style={{ color: personas[exchange.from].color }}>{personas[exchange.from].name}</b> lost the most last round and
            pays you tribute with their best card:
          </p>
          <div className="tribute-card">
            <CardView card={exchange.given} size="xl" powerCard={isPowerRank(rankOf(exchange.given), false)} initial={{ rotateY: 180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 160, damping: 16 }} />
          </div>
          <p>Choose one card to send back. Give them something useless.</p>
          <div className="pick-row">
            {hand.map((c) => (
              <CardView
                key={c}
                card={c}
                size="md"
                selected={pick === c}
                fresh={c === exchange.given}
                onClick={() => setPick(c)}
                whileHover={{ y: -8 }}
              />
            ))}
          </div>
          <div className="modal-actions">
            <button
              className="btn primary"
              disabled={pick === null}
              onClick={() => {
                if (pick !== null) onReturn(pick);
                setPick(null);
              }}
            >
              Send it back
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* -------------------------------- Round end ------------------------------- */

export function RoundEndModal({
  open,
  result,
  game,
  personas,
  onNext,
  host,
  nextLabel,
}: {
  open: boolean;
  result: RoundResult | null;
  game: GameState;
  personas: Persona[];
  onNext: () => void;
  host?: string | null;
  nextLabel?: string;
}) {
  const last = game.round >= game.settings.rounds;
  return (
    <Modal open={open} wide className="round-end">
      {result && (
        <>
          <div className="re-head">
            <Avatar persona={personas[result.winner]} size={72} active mood="happy" />
            <div>
              <div className="eyebrow">
                Round {result.round} of {game.settings.rounds}
              </div>
              <h2 className="modal-title">{result.winner === 0 ? 'You win the round!' : `${personas[result.winner].name} goes out${result.places ? ' first' : ''}`}</h2>
              <div className="re-finish">
                Finished with <b>{describeCombo(result.finishingCombo)}</b>
                {result.grandFinish && <span className="flip-tag gold">GRAND FINISH ×2</span>}
              </div>
            </div>
          </div>
          {result.places ? (
            <PlacesTable result={result} game={game} personas={personas} />
          ) : (
          <table className="re-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Left in hand</th>
                <th>Multipliers</th>
                <th className="num">Round</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((p) => (
                <motion.tr key={p} className={p === result.winner ? 'winner' : ''} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + p * 0.08 }}>
                  <td className="who">
                    <Avatar persona={personas[p]} size={30} />
                    {personas[p].name}
                  </td>
                  <td className="left">{result.leftover[p].length ? mini(result.leftover[p]) : <span className="out">OUT</span>}</td>
                  <td className="mults">
                    {result.multipliers[p].map((m) => (
                      <span key={m.label} className="mult-chip">
                        {m.label} ×{m.factor}
                      </span>
                    ))}
                  </td>
                  <td className={`num delta ${result.deltas[p] >= 0 ? 'pos' : 'neg'}`}>{result.deltas[p] > 0 ? `+${result.deltas[p]}` : result.deltas[p]}</td>
                  <td className="num total">{game.scores[p]}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          )}
          {game.settings.buwis && !last && (
            <p className="note">
              {tributeNote(result, personas)}
            </p>
          )}
          {!last && stakesNote(game, personas) && <p className="note">{stakesNote(game, personas)}</p>}
          {host && <HostNote text={host} />}
          <div className="modal-actions">
            <button className="btn primary" onClick={onNext} autoFocus>
              {nextLabel ?? (last ? 'Final standings' : 'Next round')}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

function PlacesTable({ result, game, personas }: { result: RoundResult; game: GameState; personas: Persona[] }) {
  return (
    <>
      <table className="re-table">
        <thead>
          <tr>
            <th>Place</th>
            <th>Player</th>
            <th>Left in hand</th>
            <th className="num">Round</th>
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {result.places!.map((p, i) => (
            <motion.tr key={p} className={i === 0 ? 'winner' : ''} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
              <td>
                <span className={`chip place place-${i + 1}`}>{placeLabel(i + 1).toUpperCase()}</span>
              </td>
              <td className="who">
                <Avatar persona={personas[p]} size={30} />
                {personas[p].name}
              </td>
              <td className="left">{result.leftover[p].length ? mini(result.leftover[p]) : <span className="out">OUT</span>}</td>
              <td className={`num delta ${result.deltas[p] >= 0 ? 'pos' : 'neg'}`}>{result.deltas[p] > 0 ? `+${result.deltas[p]}` : result.deltas[p]}</td>
              <td className="num total">{game.scores[p]}</td>
            </motion.tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        Klasiko plays every round out. Whoever is left holding cards is the Talo (loser). {placePointsText}.
      </p>
    </>
  );
}

function stakesNote(game: GameState, personas: Persona[]) {
  const next = { ...game, round: game.round + 1 };
  const bounty = bountySeat(next);
  const parts: string[] = [];
  if (bounty >= 0) parts.push(bounty === 0 ? 'you lead, so you carry the Patong (Bounty)' : `${personas[bounty].name} leads and carries the Patong (Bounty)`);
  if (isHulingHirit(next)) parts.push('the final round counts double (Huling Hirit)');
  return parts.length ? `Next round: ${parts.join('; ')}.` : null;
}

function tributeNote(r: RoundResult, personas: Persona[]) {
  const payer = pickTributePayer(r);
  const to = r.winner === 0 ? 'you' : personas[r.winner].name;
  return payer === 0
    ? `Buwis (Tribute) next round: you give your best card to ${to}.`
    : `Buwis (Tribute) next round: ${personas[payer].name} gives their best card to ${to}.`;
}
