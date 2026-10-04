import { LayoutGroup } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sfx, setSoundEnabled } from './audio';
import { type Card, type SortMode, cardLabel, power, rankOf, sortHand } from './engine/cards';
import { type Combo, classify, describeCombo, isPowerRank } from './engine/combos';
import {
  type GameEvent,
  type GameState,
  type Settings,
  HUMAN,
  canPass,
  createMatch,
  isLeading,
  legalPlays,
  nextRound,
  pass,
  play,
  returnTribute,
  standings,
  validatePlay,
} from './engine/game';
import { PERSONAS, chooseTributeReturn, decide } from './engine/ai';
import { lineFor, type Moment } from './lines';
import { type Mechanic, Term } from './mechanics';
import { loadSettings, loadStats, saveSettings, saveStats, type LifetimeStats } from './storage';
import { ActionBar, PlayerHand } from './components/PlayerHand';
import { Avatar, Seat, type SeatPosition } from './components/Seat';
import { TrickArea } from './components/TrickArea';
import { Tracker } from './components/Tracker';
import { ExchangeModal, MatchEndModal, RoundEndModal, RulesModal, SettingsModal } from './components/Modals';
import { Banner, type BannerData } from './components/Banner';
import { TitleScreen } from './components/TitleScreen';
import { Icon } from './components/Icons';
import { haptic, setHapticsEnabled } from './haptics';
import { usePhone } from './hooks';

const SEATS: { player: number; position: SeatPosition }[] = [
  { player: 1, position: 'left' },
  { player: 2, position: 'top' },
  { player: 3, position: 'right' },
];

const PACE = { chill: 1400, normal: 900, fast: 420 } as const;

/** Settings that may change mid-match without altering the rules being played. */
const LIVE_KEYS = ['difficulty', 'speed', 'sound', 'haptics', 'memoryMode'] as const;

function comboWeight(c: Combo, rev: boolean) {
  return c.cards.length * 100 + Math.max(...c.cards.map((x) => power(x, rev)));
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stats, setStats] = useState<LifetimeStats>(loadStats);
  const [game, setGame] = useState<GameState | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [selected, setSelected] = useState<Set<Card>>(new Set());
  const [hinted, setHinted] = useState<Set<Card>>(new Set());
  const [fresh, setFresh] = useState<Set<Card>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>('rank');
  const [bubbles, setBubbles] = useState<(string | null)[]>([null, null, null, null]);
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [shake, setShake] = useState(0);
  const [trackerOpen, setTrackerOpen] = useState(() => window.innerWidth > 1280);
  const [peekRound, setPeekRound] = useState(0);
  const [peeking, setPeeking] = useState(false);
  const [dealing, setDealing] = useState(false);
  const [statusFlash, setStatusFlash] = useState<string | null>(null);
  const cycleIdx = useRef(-1);
  const lastSeq = useRef(0);
  const prevTurn = useRef(-1);
  const bannerSeq = useRef(0);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => setSoundEnabled(settings.sound), [settings.sound]);
  useEffect(() => setHapticsEnabled(settings.haptics), [settings.haptics]);

  const phone = usePhone();

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 1100px)');
    const onChange = () => narrow.matches && setTrackerOpen(false);
    narrow.addEventListener('change', onChange);
    return () => narrow.removeEventListener('change', onChange);
  }, []);

  const updateSettings = (next: Settings) => {
    setSettings(next);
    saveSettings(next);
    setGame((g) => {
      if (!g) return g;
      const live = { ...g.settings };
      for (const k of LIVE_KEYS) (live as Record<string, unknown>)[k] = next[k];
      return { ...g, settings: live };
    });
  };

  const showBanner = useCallback(
    (b: Omit<BannerData, 'id'>, ms = 2000) => {
      const id = ++bannerSeq.current;
      setBanner({ ...b, id });
      later(() => setBanner((cur) => (cur?.id === id ? null : cur)), ms);
    },
    [later],
  );

  const say = useCallback(
    (player: number, moment: Moment, chance = 1) => {
      if (player === HUMAN || Math.random() > chance) return;
      const text = lineFor(player, moment);
      if (!text) return;
      setBubbles((b) => b.map((t, i) => (i === player ? text : t)));
      later(() => setBubbles((b) => b.map((t, i) => (i === player && t === text ? null : t))), 2400);
    },
    [later],
  );

  const startMatch = () => {
    lastSeq.current = 0;
    prevTurn.current = -1;
    setResultOpen(false);
    setMatchOpen(false);
    setSelected(new Set());
    setBubbles([null, null, null, null]);
    setPeekRound(0);
    setGame(createMatch(settings));
  };

  /* --------------------------- event reactions --------------------------- */

  const handleEvent = useCallback(
    (e: GameEvent, g: GameState) => {
      const name = (p: number) => PERSONAS[p].name;
      switch (e.kind) {
        case 'deal': {
          sfx.deal();
          setDealing(true);
          setSelected(new Set());
          setHinted(new Set());
          later(() => setDealing(false), 1400);
          const ex = g.exchange;
          if (ex) {
            const sub =
              ex.from === HUMAN
                ? `You pay ${cardLabel(ex.given)} to ${name(ex.to)}`
                : `${name(ex.from)} pays ${ex.to === HUMAN ? 'you' : name(ex.to)} their best card`;
            showBanner({ kind: 'info', title: 'Buwis · Tribute', sub }, 2600);
          }
          break;
        }
        case 'play': {
          sfx.play(e.combo.cards.length);
          const hasPower = e.combo.cards.some((c) => isPowerRank(rankOf(c), !e.flipped ? g.revolution : !g.revolution));
          if (hasPower) sfx.power();
          if (e.flipped) {
            sfx.revolution();
            haptic.revolution();
            setShake((n) => n + 1);
            if (g.revolution) {
              showBanner({ kind: 'rev', title: 'REBOLUSYON!', sub: `${name(e.player)} flipped the table. Lower beats higher. 3♣ is king.` }, 2600);
              say(e.player, 'revolution');
            } else {
              showBanner({ kind: 'unrev', title: 'RESTORED!', sub: `${name(e.player)} flipped it back. The Twos rule again.` }, 2400);
              say(e.player, 'unrevolution');
            }
          } else if (hasPower) say(e.player, 'two', 0.6);
          else if (e.combo.cards.length === 5) say(e.player, 'big', 0.45);
          break;
        }
        case 'pass':
          sfx.pass();
          say(e.player, 'pass', 0.25);
          break;
        case 'clear':
          sfx.clear();
          if (e.leader === HUMAN) showBanner({ kind: 'info', title: 'Table clear', sub: 'Everyone passed. Your lead.' }, 1600);
          else say(e.leader, 'lead', 0.3);
          break;
        case 'lastCard':
          sfx.lastCard();
          if (e.player === HUMAN) showBanner({ kind: 'warn', title: 'Last card!', sub: 'You are down to one card.' }, 1800);
          else {
            const guard = g.settings.bantay && e.player === 1 ? ' Bantay (Guard): your singles must be your strongest.' : '';
            showBanner({ kind: 'warn', title: 'Last card!', sub: `${name(e.player)} has one card left.${guard}` }, 2400);
            say(e.player, 'lastCard');
          }
          break;
        case 'roundEnd': {
          const won = e.winner === HUMAN;
          if (won) {
            sfx.win();
            haptic.win();
            say(1 + Math.floor(Math.random() * 3), 'humanWin');
          } else {
            sfx.lose();
            say(e.winner, 'win');
          }
          setStats((s) => {
            const next = { ...s, rounds: s.rounds + 1, roundWins: s.roundWins + (won ? 1 : 0) };
            saveStats(next);
            return next;
          });
          later(() => setResultOpen(true), 1300);
          break;
        }
        case 'tribute': {
          const ex = e.exchange;
          if (ex.from === HUMAN && ex.returned !== null) {
            setFresh(new Set([ex.returned]));
            later(() => setFresh(new Set()), 3500);
            showBanner({ kind: 'info', title: 'Buwis · Tribute', sub: `${name(ex.to)} sent back ${cardLabel(ex.returned)}` }, 2400);
          } else if (ex.to === HUMAN) {
            setFresh(new Set([ex.given]));
            later(() => setFresh(new Set()), 3500);
          } else if (ex.to !== HUMAN) {
            say(ex.to, 'tribute', 0.7);
          }
          break;
        }
      }
    },
    [later, say, showBanner],
  );

  useEffect(() => {
    if (!game || game.eventSeq === lastSeq.current) return;
    lastSeq.current = game.eventSeq;
    for (const e of game.events) handleEvent(e, game);
    if (game.phase === 'playing' && game.turn === HUMAN && prevTurn.current !== HUMAN) {
      sfx.turn();
      haptic.turn();
    }
    prevTurn.current = game.phase === 'playing' ? game.turn : -1;
  }, [game, handleEvent]);

  /* ------------------------------ AI driver ------------------------------ */

  const paused = showRules || showSettings;

  useEffect(() => {
    if (!game || paused) return;
    if (game.phase === 'playing' && game.turn !== HUMAN) {
      const base = PACE[game.settings.speed];
      const delay = base * (game.trick.done ? 1.3 : 1) * (game.firstPlay ? 1.5 : 1) + Math.random() * base * 0.5;
      const t = window.setTimeout(() => {
        setGame((g) => {
          if (g !== game) return g;
          const d = decide(g, g.turn, PERSONAS[g.turn], g.settings.difficulty, Math.random);
          return d.combo ? play(g, g.turn, d.combo.cards) : pass(g, g.turn);
        });
      }, delay);
      return () => clearTimeout(t);
    }
    if (game.phase === 'exchange' && game.exchange && game.exchange.to !== HUMAN) {
      const t = window.setTimeout(() => {
        setGame((g) => (g === game ? returnTribute(g, chooseTributeReturn(g, g.exchange!.to)) : g));
      }, 2200);
      return () => clearTimeout(t);
    }
  }, [game, paused]);

  /* --------------------------- human controls ---------------------------- */

  const myTurn = !!game && game.phase === 'playing' && game.turn === HUMAN;
  const selArr = useMemo(() => [...selected], [selected]);
  const validation = game && myTurn && selArr.length ? validatePlay(game, HUMAN, selArr) : null;

  const myOptions = useMemo(() => {
    if (!game || !myTurn) return [];
    return legalPlays(game, HUMAN).sort((a, b) => comboWeight(a, game.revolution) - comboWeight(b, game.revolution));
  }, [game, myTurn]);

  useEffect(() => {
    cycleIdx.current = -1;
  }, [game?.eventSeq]);

  const setCard = (c: Card, on: boolean) => {
    sfx.select();
    haptic.tap();
    setHinted(new Set());
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(c);
      else n.delete(c);
      return n;
    });
  };

  const flash = (msg: string) => {
    setStatusFlash(msg);
    later(() => setStatusFlash((m) => (m === msg ? null : m)), 1800);
  };

  const doPlay = (extra: Card | null = null) => {
    if (!game || !myTurn) return;
    const cards = extra === null || selected.has(extra) ? selArr : [...selArr, extra];
    if (!cards.length) return;
    const v = validatePlay(game, HUMAN, cards);
    if (!v.ok) {
      sfx.error();
      haptic.error();
      if (extra !== null) setSelected(new Set(cards));
      flash(v.reason);
      return;
    }
    haptic.play();
    setGame(play(game, HUMAN, cards));
    setSelected(new Set());
    setHinted(new Set());
  };

  const doPass = () => {
    if (!game || !canPass(game, HUMAN)) return;
    setGame(pass(game, HUMAN));
    setSelected(new Set());
    setHinted(new Set());
  };

  const doCycle = () => {
    if (!myOptions.length) {
      flash(isLeading(game!) ? 'No combos?' : 'Nothing beats it — pass');
      return;
    }
    cycleIdx.current = (cycleIdx.current + 1) % myOptions.length;
    sfx.select();
    setHinted(new Set());
    setSelected(new Set(myOptions[cycleIdx.current].cards));
  };

  const doHint = () => {
    if (!game || !myTurn) return;
    const d = decide(game, HUMAN, PERSONAS[3], 'hard', Math.random);
    if (d.combo) {
      setSelected(new Set(d.combo.cards));
      setHinted(new Set(d.combo.cards));
      flash(`Try: ${describeCombo(d.combo)}`);
    } else flash('Hint: save your strength — pass');
  };

  const modalOpen = showRules || showSettings || resultOpen || matchOpen || (game?.phase === 'exchange' && game.exchange?.to === HUMAN);

  useEffect(() => {
    if (!game) return;
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen) return;
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
      const k = e.key.toLowerCase();
      if (k === 'enter') {
        e.preventDefault();
        doPlay();
      } else if (k === ' ') {
        e.preventDefault();
        doPass();
      } else if (k === 'tab') {
        e.preventDefault();
        doCycle();
      } else if (k === 'h') doHint();
      else if (k === 's') setSortMode((m) => (m === 'rank' ? 'suit' : 'rank'));
      else if (k === 'escape') setSelected(new Set());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const onNext = () => {
    if (!game) return;
    setResultOpen(false);
    if (game.phase === 'roundEnd') setGame(nextRound(game));
    else if (game.phase === 'matchEnd') {
      const won = standings(game)[0] === HUMAN;
      setStats((s) => {
        const next: LifetimeStats = {
          ...s,
          matches: s.matches + 1,
          matchWins: s.matchWins + (won ? 1 : 0),
          revolutions: s.revolutions + game.stats.revolutions[HUMAN],
          bestMatchScore: s.bestMatchScore === null ? game.scores[HUMAN] : Math.max(s.bestMatchScore, game.scores[HUMAN]),
        };
        saveStats(next);
        return next;
      });
      if (won) sfx.win();
      setMatchOpen(true);
    }
  };

  const onPeek = () => {
    if (!game) return;
    setPeekRound(game.round);
    setPeeking(true);
    later(() => setPeeking(false), 4000);
  };

  /* -------------------------------- render ------------------------------- */

  if (!game) {
    return (
      <>
        <TitleScreen
          stats={stats}
          difficulty={settings.difficulty}
          onDifficulty={(d) => updateSettings({ ...settings, difficulty: d })}
          onPlay={startMatch}
          onRules={() => setShowRules(true)}
          onSettings={() => setShowSettings(true)}
        />
        <RulesModal open={showRules} onClose={() => setShowRules(false)} />
        <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} settings={settings} onChange={updateSettings} inMatch={false} />
      </>
    );
  }

  const g = game;
  const myHand = sortHand(g.hands[HUMAN], sortMode, g.revolution);
  const memoryMode = g.settings.memoryMode;
  const visibleTrickCards = new Set(
    g.trick.done && memoryMode ? [] : g.trick.plays.filter((p) => p.combo).slice(-3).flatMap((p) => p.combo!.cards),
  );
  const discard = g.played.filter((c) => !visibleTrickCards.has(c));
  const leading = isLeading(g);
  const top = g.trick.top;

  let status: { tone: 'ok' | 'bad' | 'idle'; text: string };
  if (statusFlash) status = { tone: statusFlash.startsWith('Try') || statusFlash.startsWith('Hint') ? 'ok' : 'bad', text: statusFlash };
  else if (g.phase === 'exchange') status = { tone: 'idle', text: 'Tribute exchange in progress…' };
  else if (g.phase !== 'playing') status = { tone: 'idle', text: 'Round over' };
  else if (!myTurn) {
    const c = selArr.length ? classify(selArr) : null;
    status = { tone: 'idle', text: c ? `${describeCombo(c)} · waiting for your turn` : `${PERSONAS[g.turn].name} is thinking…` };
  } else if (!selArr.length) {
    if (g.firstPlay) status = { tone: 'idle', text: 'Your opening — must include 3♣' };
    else if (leading) status = { tone: 'idle', text: 'Your lead — play anything' };
    else if (!myOptions.length) status = { tone: 'bad', text: `Nothing beats ${describeCombo(top!)} — pass` };
    else status = { tone: 'idle', text: `Beat ${describeCombo(top!)} or pass` };
  } else if (validation?.ok)
    status = { tone: 'ok', text: phone ? `${describeCombo(validation.combo)} · swipe up to play` : describeCombo(validation.combo) };
  else status = { tone: 'bad', text: validation?.reason ?? '' };

  const lastResult = g.history[g.history.length - 1] ?? null;
  const flags = [
    g.settings.revolution && 'revolution',
    g.settings.bantay && 'bantay',
    g.settings.buwis && 'buwis',
    memoryMode && 'memory',
  ].filter(Boolean) as Mechanic[];

  return (
    <div className={`game ${g.revolution ? 'rev' : ''} ${shake ? `shake-${shake % 2}` : ''} ${trackerOpen ? 'tracker-open' : ''}`}>
      <header className="topbar">
        <button className="logo-small" onClick={() => confirm('Leave this match?') && setGame(null)} title="Back to title">
          REBOLUSYON
        </button>
        <div className="tb-round" title={`Round ${g.round} of ${g.settings.rounds}`}>
          <span className="tb-round-label">Round</span> <b>{g.round}</b>/{g.settings.rounds}
          <span className="tb-pips" aria-hidden="true">
            {Array.from({ length: g.settings.rounds }, (_, i) => (
              <i key={i} className={i + 1 < g.round ? 'done' : i + 1 === g.round ? 'now' : ''} />
            ))}
          </span>
        </div>
        <div className="tb-flags">
          {flags.map((f) => (
            <span key={f} className="flag">
              <Term m={f} />
            </span>
          ))}
          {g.settings.strictPass && <span className="flag">Strict pass</span>}
        </div>
        <div className="tb-actions">
          <button className={`btn ghost small icon-btn ${trackerOpen ? 'on' : ''}`} onClick={() => setTrackerOpen((o) => !o)} title="Card tracker">
            <Icon name="grid" size={16} />
            <span className="btn-label">Tracker</span>
          </button>
          <button className="btn ghost small icon-btn" onClick={() => setShowRules(true)} title="How to play">
            <Icon name="help" size={16} />
            <span className="btn-label">Rules</span>
          </button>
          <button className="btn ghost small icon-btn" onClick={() => setShowSettings(true)} title="Settings">
            <Icon name="gear" size={16} />
            <span className="btn-label">Settings</span>
          </button>
        </div>
      </header>

      <LayoutGroup id={`round-${g.round}`}>
        <main className="table">
          <div className="mat" aria-hidden="true" />
          {SEATS.map(({ player, position }) => (
            <Seat
              key={player}
              player={player}
              persona={PERSONAS[player]}
              cards={g.hands[player]}
              score={g.scores[player]}
              position={position}
              isTurn={g.phase === 'playing' && g.turn === player}
              passed={g.trick.passed[player] && !g.trick.done}
              isLeader={!!top && !g.trick.done && g.trick.topBy === player}
              bubble={bubbles[player]}
            />
          ))}
          <TrickArea trick={g.trick} revolution={g.revolution} personas={PERSONAS} memoryMode={memoryMode} discard={discard} firstPlay={g.firstPlay} turn={g.turn} />
        </main>

        <section className={`me ${myTurn ? 'my-turn' : ''}`}>
          <div className="me-id">
            <Avatar persona={PERSONAS[HUMAN]} size={52} active={myTurn} />
            <div>
              <div className="seat-name">You</div>
              <div className="seat-chips">
                <span className={`chip score ${g.scores[HUMAN] < 0 ? 'neg' : ''}`}>{g.scores[HUMAN] > 0 ? `+${g.scores[HUMAN]}` : g.scores[HUMAN]}</span>
                {g.trick.passed[HUMAN] && !g.trick.done && <span className="chip pass">PASS</span>}
                {myTurn && <span className="chip your-turn">YOUR TURN</span>}
              </div>
            </div>
          </div>
          <PlayerHand
            hand={myHand}
            selected={selected}
            hinted={hinted}
            fresh={fresh}
            revolution={g.revolution}
            onSet={setCard}
            onSwipeUp={(from) => doPlay(from)}
            dealing={dealing}
          />
          <ActionBar
            isTurn={myTurn}
            canPass={canPass(g, HUMAN)}
            canPlay={!!validation?.ok}
            status={status}
            onPlay={() => doPlay()}
            onPass={doPass}
            onClear={() => setSelected(new Set())}
            onHint={doHint}
            onCycle={doCycle}
            onSort={() => setSortMode((m) => (m === 'rank' ? 'suit' : 'rank'))}
            sortMode={sortMode}
            hasSelection={selected.size > 0}
          />
        </section>
      </LayoutGroup>

      <Tracker
        played={g.played}
        myHand={g.hands[HUMAN]}
        memoryMode={memoryMode}
        peeking={peeking}
        peekAvailable={peekRound !== g.round}
        onPeek={onPeek}
        log={g.log}
        personas={PERSONAS}
        revolution={g.revolution}
        open={trackerOpen}
        onToggle={() => setTrackerOpen((o) => !o)}
        phone={phone}
      />

      <Banner banner={banner} />

      <ExchangeModal exchange={g.phase === 'exchange' ? g.exchange : null} hand={sortHand(g.hands[HUMAN], 'rank')} personas={PERSONAS} onReturn={(c) => setGame(returnTribute(g, c))} />
      <RoundEndModal open={resultOpen} result={lastResult} game={g} personas={PERSONAS} onNext={onNext} />
      <MatchEndModal
        open={matchOpen}
        game={g}
        personas={PERSONAS}
        onAgain={startMatch}
        onTitle={() => {
          setMatchOpen(false);
          setGame(null);
        }}
      />
      <RulesModal open={showRules} onClose={() => setShowRules(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} settings={settings} onChange={updateSettings} inMatch />
    </div>
  );
}
