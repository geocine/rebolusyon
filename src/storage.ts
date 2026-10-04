import { DEFAULT_SETTINGS, type Settings } from './engine/game';

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

export const loadSettings = () => read<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
export const loadStats = () => read<LifetimeStats>(STATS_KEY, EMPTY_STATS);
export const saveStats = (s: LifetimeStats) => localStorage.setItem(STATS_KEY, JSON.stringify(s));
