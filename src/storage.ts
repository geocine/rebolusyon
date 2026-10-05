import { type Cast, DEFAULT_SETTINGS, type Settings, withMode } from './engine/game';

export interface LifetimeStats {
  matches: number;
  matchWins: number;
  rounds: number;
  roundWins: number;
  revolutions: number;
  bestMatchScore: number | null;
}

const SETTINGS_KEY = 'rebolusyon.settings.v1';
const STATS_KEY = 'rebolusyon.stats.v1';
const CAST_KEY = 'rebolusyon.lastCast.v1';

export const EMPTY_STATS: LifetimeStats = {
  matches: 0,
  matchWins: 0,
  rounds: 0,
  roundWins: 0,
  revolutions: 0,
  bestMatchScore: null,
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export function loadSettings(): Settings {
  const { alsa: _renamedToResbak, ...stored } = read<Settings & { alsa?: boolean }>(SETTINGS_KEY, DEFAULT_SETTINGS);
  return withMode(stored);
}
export const saveSettings = (s: Settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
export const loadStats = () => read<LifetimeStats>(STATS_KEY, EMPTY_STATS);

export function loadLastCast(): Cast | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem(CAST_KEY) ?? 'null');
    return Array.isArray(raw) && raw.every((x) => typeof x === 'string') ? raw : undefined;
  } catch {
    return undefined;
  }
}
export const saveLastCast = (c: Cast) => localStorage.setItem(CAST_KEY, JSON.stringify(c));
export const saveStats = (s: LifetimeStats) => localStorage.setItem(STATS_KEY, JSON.stringify(s));
