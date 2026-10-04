import type { Difficulty } from './engine/game';

export const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: 'Chill', desc: 'Relaxed bots. They forget cards and make human mistakes.' },
  { value: 'normal', label: 'Sharp', desc: 'Bots play hands out in their heads and remember most cards.' },
  { value: 'hard', label: 'Hustler', desc: 'Deep search, perfect memory, and they read your passes.' },
  { value: 'rival', label: 'Rival', desc: 'Hustler brains that keep the match close: they ease off when you trail and gang up when you lead.' },
];
