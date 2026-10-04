/** Filipino names for the variant's mechanics, always shown alongside their English meaning. */
export const MECHANICS = {
  revolution: { name: 'Rebolusyon', en: 'Revolution', desc: 'Four of a Kind flips the card order.' },
  bantay: { name: 'Bantay', en: 'Guard', desc: 'If the next player has 1 card, your single must be your strongest.' },
  buwis: { name: 'Buwis', en: 'Tribute', desc: 'The biggest loser gives their best card to the last winner.' },
  memory: { name: 'Alaala', en: 'Memory', desc: 'No card tracker. Count cards in your head.' },
  peek: { name: 'Sulyap', en: 'Peek', desc: 'A 4-second look at the tracker, once per round.' },
} as const;

export type Mechanic = keyof typeof MECHANICS;

/** "Bantay · Guard" with a tooltip explaining the rule. */
export function Term({ m, gloss = true }: { m: Mechanic; gloss?: boolean }) {
  const t = MECHANICS[m];
  return (
    <span className="term" title={`${t.name} (${t.en}): ${t.desc}`}>
      {t.name}
      {gloss && <span className="term-en">{t.en}</span>}
    </span>
  );
}

export const termText = (m: Mechanic) => `${MECHANICS[m].name} (${MECHANICS[m].en})`;
