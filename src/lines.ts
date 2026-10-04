/** Table talk: English first, with the Taglish you'd hear at a real Pusoy Dos table. */
type Moment =
  | 'pass'
  | 'two'
  | 'big'
  | 'revolution'
  | 'unrevolution'
  | 'lastCard'
  | 'win'
  | 'lead'
  | 'humanWin'
  | 'tribute'
  /** The bot's own search says it is very likely to win this round. */
  | 'confident'
  /** The bot's search says it is almost certainly losing this round. */
  | 'worried'
  /** You passed when you could have gone out, so now the bot knows what you don't have. */
  | 'read';

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
    confident: ['Lola can see the finish line, anak.', 'Slowly, slowly… almost there.', 'You can start shuffling, apo.'],
    worried: ['Ay, this hand. Pray for Lola.', 'Lola is just here for the company.', 'Hay naku. Next round na lang.'],
    read: ['Ah, so you don’t have it. Lola noticed.', 'Hmm. Nothing bigger, ’no?'],
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
    confident: ['GG na ’to, pare!', 'Start counting your cards, boss.', 'Ready na the taho!'],
    worried: ['Okay okay, this round doesn’t count.', 'Pare, I’m cooked.', 'Bad cards, bad vibes.'],
    read: ['Hala, you can’t beat that? Nice to know!', 'Ohh, no answer? Noted, pare.'],
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
    confident: ['I like my odds.', 'This one’s mine.', 'Ran the numbers. Sorry.'],
    worried: ['Long shot. Still counting.', 'Bad spot. Not over.', 'Damage control.'],
    read: ['You couldn’t beat it. Noted.', 'That pass told me everything.', 'So that card isn’t with you.'],
  },
};

export function lineFor(player: number, moment: Moment, rng = Math.random): string | null {
  const opts = LINES[player]?.[moment];
  if (!opts?.length) return null;
  return opts[Math.floor(rng() * opts.length)];
}

export type { Moment };
