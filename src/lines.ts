/** Table talk. Taglish, the way it sounds at a real Pusoy Dos table. */
type Moment = 'pass' | 'two' | 'big' | 'revolution' | 'unrevolution' | 'lastCard' | 'win' | 'lead' | 'humanWin' | 'tribute';

const LINES: Record<number, Partial<Record<Moment, string[]>>> = {
  1: {
    pass: ['Pass muna, iho.', 'Sige, daan ka.', 'Hmm. Pass.', 'Hindi pa ngayon.'],
    two: ['Pasensya na, apo.', 'Matagal ko nang tinatago ’to.', 'Dos ni Lola.'],
    big: ['Hay naku, tingnan mo ’to.', 'Ganyan ang laro noong panahon namin.'],
    revolution: ['Ay! Baliktad na ang mundo!', 'Rebolusyon, mga anak!'],
    unrevolution: ['Balik sa ayos.', 'Ayan, tama na ang gulo.'],
    lastCard: ['Isa na lang si Lola.', 'Bantayan niyo ako, ha.'],
    win: ['Salamat sa laro, mga apo.', 'Ang lola, hindi pa kumukupas.'],
    humanWin: ['Galing mo, apo!', 'Natuto ka na pala.'],
    tribute: ['Ibalik ko na lang ’to.', 'Heto, para sa ’yo.'],
    lead: ['Ako muna.', 'Sige, simulan natin.'],
  },
  2: {
    pass: ['Pass! Pass!', 'Next na, bilis!', 'Daan ka muna, pare.', 'Taya mo ’yan.'],
    two: ['DOS! Sorry na lang!', 'Ayan na ang Dos, pare!', 'Boom. Dos.'],
    big: ['Tingnan niyo ’to!', 'Full force, pare!', 'Panis!'],
    revolution: ['REBOLUSYON!!!', 'Baliktarin natin ’to!', 'Gulo na ’to, pare!'],
    unrevolution: ['Balik! Balik!', 'Ibalik ang trono!'],
    lastCard: ['Isa na lang! Bantay kayo!', 'Huling baraha, mga pre!'],
    win: ['Panalo! Libre ko kayo ng taho.', 'Hari ng mesa!'],
    humanWin: ['Swerte mo lang ’yan!', 'Rematch tayo, pare.'],
    tribute: ['Oh, heto. Walang kwenta ’yan.', 'Sayo na ’yan.'],
    lead: ['Ako na!', 'Labas na!'],
  },
  3: {
    pass: ['Pass.', '…pass.', 'Not yet.', 'Hold.'],
    two: ['That was the last strong one out there.', 'Counted it.', 'Mine.'],
    big: ['Calculated.', 'Clean.'],
    revolution: ['Flip it.', 'Order inverted. Adjust.'],
    unrevolution: ['Back to normal.', 'Re-calibrating.'],
    lastCard: ['One left.', 'Do the math.'],
    win: ['GG.', 'Expected value: realized.'],
    humanWin: ['Nice read.', 'Well played.'],
    tribute: ['You won’t need this.', 'Here.'],
    lead: ['My lead.', 'Opening.'],
  },
};

export function lineFor(player: number, moment: Moment, rng = Math.random): string | null {
  const opts = LINES[player]?.[moment];
  if (!opts?.length) return null;
  return opts[Math.floor(rng() * opts.length)];
}

export type { Moment };
