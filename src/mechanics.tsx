import { type Card, makeCard } from './engine/cards';
import { PLACE_POINTS, type RuleMode } from './engine/game';

/** Filipino names for the variant's mechanics, always shown alongside their English meaning. */
export const MECHANICS = {
  revolution: { name: 'Rebolusyon', en: 'Revolution', desc: 'Four of a Kind flips the card order.' },
  bantay: { name: 'Bantay', en: 'Guard', desc: 'If the next player has 1 card, your single must be your strongest.' },
  buwis: { name: 'Buwis', en: 'Tribute', desc: 'The biggest loser gives their best card to the last winner.' },
  patong: { name: 'Patong', en: 'Bounty', desc: 'The match leader pays double if they lose a round.' },
  hirit: { name: 'Huling Hirit', en: 'Last Hurrah', desc: 'The final round counts double.' },
  alsa: { name: 'Alsa', en: 'Uprising', desc: 'The player in last place can start a Rebolusyon with Three of a Kind.' },
  puwesto: { name: 'Puwesto', en: 'Places', desc: 'Everyone plays until one is left holding cards. Score by finishing place.' },
  memory: { name: 'Alaala', en: 'Memory', desc: 'No card tracker. Count cards in your head.' },
  peek: { name: 'Sulyap', en: 'Peek', desc: 'A 4-second look at the tracker, once per round.' },
} as const;

export type Mechanic = keyof typeof MECHANICS;

/** "Bantay · Guard" with a tooltip explaining the rule; `english` shows only "Guard". */
export function Term({ m, gloss = true, english = false }: { m: Mechanic; gloss?: boolean; english?: boolean }) {
  const t = MECHANICS[m];
  return (
    <span className="term" title={`${t.name} (${t.en}): ${t.desc}`}>
      {english ? t.en : t.name}
      {gloss && !english && <span className="term-en">{t.en}</span>}
    </span>
  );
}

export const termText = (m: Mechanic) => `${MECHANICS[m].name} (${MECHANICS[m].en})`;

export const ordinal = (place: number) => ['1st', '2nd', '3rd', '4th'][place - 1] ?? `${place}th`;

/** One rule as a mode card explains it: its name (a mechanic, or plain words) and what it does. */
export interface RuleLine {
  m?: Mechanic;
  name?: string;
  text: string;
}

export interface RuleGroup {
  title: string;
  tone: 'clay' | 'gold' | 'sage' | 'paper';
  rules: RuleLine[];
  /** Shown instead of rules when a mode leaves this group out. */
  off?: string;
}

export interface ModeInfo {
  value: RuleMode;
  name: string;
  en: string;
  tagline: string;
  /** A little fanned hand that sums the mode up; `crown` is the card that rules it. */
  hero: Card[];
  crown: Card;
  groups: RuleGroup[];
}

const GUARD: RuleGroup = {
  title: 'Guard',
  tone: 'sage',
  rules: [{ m: 'bantay', text: 'If the next player has one card left, any single you play must be your strongest.' }],
};

/** The two ways to play. Each bundles rules that only make sense together. */
export const MODES: ModeInfo[] = [
  {
    value: 'rebolusyon',
    name: 'Rebolusyon',
    en: 'House rules',
    tagline: 'The full fiesta. Flips, stakes, and comebacks to the last hand.',
    hero: [makeCard(12, 1), makeCard(0, 0), makeCard(12, 3)],
    crown: makeCard(0, 0),
    groups: [
      {
        title: 'Round',
        tone: 'paper',
        rules: [{ name: 'First out wins', text: 'The round ends when someone goes out. Everyone else pays 1 point per card left.' }],
      },
      {
        title: 'Flip',
        tone: 'clay',
        rules: [
          { m: 'revolution', text: 'Four of a Kind flips the order, so 3s beat Twos until someone flips it back.' },
          { m: 'alsa', text: 'Whoever is alone in last place can flip it with just Three of a Kind.' },
        ],
      },
      {
        title: 'Stakes',
        tone: 'gold',
        rules: [
          { m: 'buwis', text: 'The biggest loser hands the winner their best card and gets one back.' },
          { m: 'patong', text: 'The match leader pays double for any round they lose.' },
          { m: 'hirit', text: 'The final round counts double, so no lead is safe.' },
        ],
      },
      GUARD,
    ],
  },
  {
    value: 'klasiko',
    name: 'Klasiko',
    en: 'Classic',
    tagline: 'Straight Pusoy Dos. Every round is played out to the last card, and the Twos always rule.',
    hero: [makeCard(11, 1), makeCard(12, 3), makeCard(10, 2)],
    crown: makeCard(12, 3),
    groups: [
      {
        title: 'Round',
        tone: 'paper',
        rules: [{ m: 'puwesto', text: `Going out first doesn’t end the round. The rest play on until one is left holding cards. Places score ${PLACE_POINTS.map((v) => (v > 0 ? `+${v}` : `−${-v}`)).join(', ')}.` }],
      },
      { title: 'Flip', tone: 'clay', rules: [], off: 'None. The order never changes.' },
      { title: 'Stakes', tone: 'gold', rules: [], off: 'None. Every round is worth the same.' },
      GUARD,
    ],
  },
];

export const modeOf = (m: RuleMode) => MODES.find((x) => x.value === m) ?? MODES[0];
