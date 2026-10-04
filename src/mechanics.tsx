import type { RuleMode } from './engine/game';

/** Filipino names for the variant's mechanics, always shown alongside their English meaning. */
export const MECHANICS = {
  revolution: { name: 'Rebolusyon', en: 'Revolution', desc: 'Four of a Kind flips the card order.' },
  bantay: { name: 'Bantay', en: 'Guard', desc: 'If the next player has 1 card, your single must be your strongest.' },
  buwis: { name: 'Buwis', en: 'Tribute', desc: 'The biggest loser gives their best card to the last winner.' },
  patong: { name: 'Patong', en: 'Bounty', desc: 'The match leader pays double if they lose a round.' },
  hirit: { name: 'Huling Hirit', en: 'Last Hurrah', desc: 'The final round counts double.' },
  alsa: { name: 'Alsa', en: 'Uprising', desc: 'The player in last place can start a Rebolusyon with Three of a Kind.' },
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

export interface RuleGroup {
  title: string;
  terms: Mechanic[];
  text: string;
}

const GUARD: RuleGroup = { title: 'Guard', terms: ['bantay'], text: 'No feeding a player on their last card.' };

/** The two ways to play. Each bundles rules that only make sense together. */
export const MODES: { value: RuleMode; name: string; en: string; tagline: string; groups: RuleGroup[] }[] = [
  {
    value: 'rebolusyon',
    name: 'Rebolusyon',
    en: 'House rules',
    tagline: 'The full fiesta. Flips, stakes, and comebacks to the last hand.',
    groups: [
      { title: 'Flip', terms: ['revolution', 'alsa'], text: 'Four of a Kind turns the order upside down. Last place can do it with three.' },
      { title: 'Stakes', terms: ['buwis', 'patong', 'hirit'], text: 'Losers pay tribute, the leader wears a bounty, the final round counts double.' },
      GUARD,
    ],
  },
  {
    value: 'klasiko',
    name: 'Klasiko',
    en: 'Classic',
    tagline: 'Straight Pusoy Dos. Twos rule, no twists, every round counts the same.',
    groups: [GUARD],
  },
];

export const modeOf = (m: RuleMode) => MODES.find((x) => x.value === m) ?? MODES[0];
