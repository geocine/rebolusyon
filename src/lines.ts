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
  | 'read'
  /** Sitting down at the start of a match. */
  | 'hello';

/** Keyed by persona initials. */
const LINES: Record<string, Partial<Record<Moment, string[]>>> = {
  LN: {
    hello: ['Sit, sit, mga apo. Lola will deal you in.', 'Ay, new faces. Be gentle with Lola, ha.', 'Did everyone eat? Okay. Cards.'],
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
  KJ: {
    hello: ['Game na! Who’s ready to lose?', 'Pare! Sit down, sit down.', 'Taho bet, winner takes all!'],
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
  MK: {
    hello: ['Hi.', 'Fifty-two cards. Let’s go.', 'I’ll be counting.'],
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
  AJ: {
    hello: ['Okay, I opened a new tab for everyone.', 'Store’s closed, cards are open.', 'Hello, my suki (regulars)!'],
    pass: ['Pass. I’ll put it on your tab.', 'Sige, go ahead.', 'Pass muna.', 'Not buying that one.'],
    two: ['Two. That one’s on the house.', 'Pay up, ha.', 'Exact change.'],
    big: ['Wholesale price!', 'Bulk order, coming through.', 'Inventory clearance!'],
    revolution: ['Rebolusyon! Prices just flipped!', 'Everything on sale, upside down!'],
    unrevolution: ['Back to regular prices.', 'Okay, sale’s over.'],
    lastCard: ['Last item on the shelf.', 'One left. Closing time soon.'],
    win: ['Pay at the counter, everyone.', 'Tab settled. In my favor.'],
    humanWin: ['Okay, okay. This round’s on me.', 'Galing! I’ll give you a discount.'],
    tribute: ['Here’s your change.', 'Sukli (change). Don’t spend it all.'],
    lead: ['Store’s open.', 'I’ll start the tab.'],
    confident: ['The books are balancing nicely.', 'Profit margin looks good.'],
    worried: ['Hay, this hand is all utang (debt).', 'Bad day for business.'],
    read: ['Out of stock, ’no? I noticed.', 'No bigger card? Noted in the ledger.'],
  },
  TB: {
    hello: ['Hoy! Long time, no see!', 'Tito’s here. The party can start.', 'Deal me in, I’m just warming up.'],
    pass: ['Pass. Tito is resting.', 'Pass, pass. Pacing myself.', 'Not yet, hijo.', 'Pass. You’ll see.'],
    two: ['SURPRISE! Tito had a Two!', 'Ha! You didn’t think I’d use it?', 'And here… it… is!'],
    big: ['My way! (Frank Sinatra, look it up.)', 'Tito’s comeback tour!', 'Remember this one, ha!'],
    revolution: ['Rebolusyon! Like EDSA, but with cards!', 'Ay, everything upside down. Like my knees.'],
    unrevolution: ['Back to normal, like the old days.', 'Order! Order!'],
    lastCard: ['Oops. Tito has one card.', 'One card. Who saw that coming? Nobody!'],
    win: ['Tito still has it!', 'And THAT is why I passed so much.'],
    humanWin: ['Ay, the young ones these days!', 'Good one, hijo. Rematch at the reunion.'],
    tribute: ['Here, a gift from Tito.', 'Use it wisely, hijo.'],
    lead: ['Tito goes first.', 'Let Tito start.'],
    confident: ['Tito’s about to sing.', 'Prepare the videoke (karaoke).'],
    worried: ['Tito will win the next one.', 'This hand is like my back. Not good.'],
    read: ['Ah, you don’t have it. Tito knows.', 'Nothing? Interesting, hijo.'],
  },
  BE: {
    hello: ['hiii, let’s speedrun this', 'gg in advance', 'okay, I have like ten minutes'],
    pass: ['pass, next', 'skip', 'nah', 'pass, go go go'],
    two: ['Two, no hesitation', 'why would I save it lol', 'used it. no regrets'],
    big: ['combo!!', 'frame perfect', 'clean dump, no lag'],
    revolution: ['REBOLUSYON, chat!', 'order flipped, any% route'],
    unrevolution: ['patch reverted', 'back to the meta'],
    lastCard: ['last card, clip it', 'one left, final split'],
    win: ['new personal best', 'gg ez (jk, gg)'],
    humanWin: ['okay you’re cracked', 'gg, that was clean'],
    tribute: ['here, I don’t need it', 'take it, it’s mid'],
    lead: ['I’ll start, hurry', 'my lead, quick'],
    confident: ['on world-record pace', 'this run is it'],
    worried: ['this run is cooked', 'reset? can we reset?'],
    read: ['you couldn’t beat that? noted', 'no answer, huh? copy'],
  },
  MC: {
    hello: ['Upo kayo (sit down). First game is free.', 'Ahh, fresh customers.', 'Same as last time? Short on the sides?'],
    pass: ['Pass. Taking a little off the top.', 'Pass muna.', 'Hmm. Let me think.', 'Pass. Go ahead, boss.'],
    two: ['Clean cut. Two.', 'Snip.', 'Let me trim that for you.'],
    big: ['Full service!', 'The works, boss.', 'With hot towel.'],
    revolution: ['Rebolusyon! New style!', 'Flip it! Like a mohawk!'],
    unrevolution: ['Back to the classic cut.', 'Tidy again.'],
    lastCard: ['One card. Almost done with your haircut.', 'Last snip coming.'],
    win: ['Next customer, please!', 'Looking sharp, if I say so.'],
    humanWin: ['Nice. I’ll tell the whole barangay.', 'You’re the talk of the shop now.'],
    tribute: ['Tip for you, boss.', 'Here. Free shave.'],
    lead: ['I’ll start the cut.', 'Barber goes first.'],
    confident: ['I can see how this ends, boss.', 'Already sweeping up.'],
    worried: ['Hay, bad hair day.', 'This hand needs a lot of gel.'],
    read: ['You sighed. I heard that.', 'No bigger one, ’no? I can tell.', 'Your face told me, boss.'],
  },
};

export function lineFor(personaId: string, moment: Moment, rng = Math.random): string | null {
  const opts = LINES[personaId]?.[moment];
  if (!opts?.length) return null;
  return opts[Math.floor(rng() * opts.length)];
}

export type { Moment };
