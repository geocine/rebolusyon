import type { Difficulty } from './engine/game';

export const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: 'Chill', desc: 'Relaxed bots. They forget cards and make human mistakes.' },
  { value: 'normal', label: 'Sharp', desc: 'Bots think a few moves ahead and remember many of the cards played.' },
  { value: 'hard', label: 'Hustler', desc: 'Deep search, perfect memory, and they read your passes.' },
  { value: 'rival', label: 'Rival', desc: 'Hustler brains that keep the match close: they ease off the further you trail and gang up when you lead.' },
];
