/** Table talk: English first, with the Taglish you'd hear at a real Pusoy Dos table. */
type Moment = 'pass' | 'two' | 'big' | 'revolution' | 'unrevolution' | 'lastCard' | 'win' | 'lead' | 'humanWin' | 'tribute';

const LINES: Record<number, Partial<Record<Moment, string[]>>> = {
  1: {
    pass: ['Pass muna. Patience, iho.', 'Go ahead, anak.', 'Hmm. I’ll wait.', 'Not yet, not yet.'],
    two: ['Sorry, apo. Lola’s Two.', 'I’ve been saving this one.', 'Ay, you didn’t see this coming.'],
    big: ['This is how we played in ’74.', 'Hay naku, look at this.'],
    revolution: ['Ay! Everything is upside down!', 'Rebolusyon, mga anak!'],
    unrevolution: ['There. Back to proper order.', 'Enough chaos for today.'],
    lastCard: ['Lola has one card left, ha.', 'Watch me now, anak.'],
    win: ['Thank you for the game, mga apo.', 'Lola still has it.'],
    humanWin: ['Very good, apo!', 'You learned well.'],
    tribute: ['Here, take this one back.', 'For you, anak.'],
    lead: ['Lola goes first.', 'Let’s begin.'],
  },
  2: {
    pass: ['Pass! Pass!', 'Next na, quick!', 'Go ahead, pare.', 'Your move, boss.'],
    two: ['DOS! Sorry na lang!', 'Here comes the Two, pare!', 'Boom. Two.'],
    big: ['Check this out!', 'Full force, pare!', 'Grabe, right?'],
    revolution: ['REBOLUSYON!!!', 'Flip the table, pare!', 'Chaos time!'],
    unrevolution: ['Flip it back! Flip it back!', 'Order restored, boss.'],
    lastCard: ['One card left! Better watch out!', 'Last card na, guys!'],
    win: ['Panalo! Taho’s on me.', 'King of the table!'],
    humanWin: ['Swerte lang ’yan. Pure luck!', 'Rematch, pare.'],
    tribute: ['Here. It’s useless anyway.', 'Keep it, boss.'],
    lead: ['Me first!', 'Let’s go!'],
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
