import type { Difficulty, GameState } from './engine/game';
import { type Thought, think } from './engine/search';

export interface AIRequest {
  id: number;
  state: GameState;
  player: number;
  difficulty: Difficulty;
}

export interface AIResponse {
  id: number;
  thought: Thought;
}

let worker: Worker | null = null;
let broken = false;
let seq = 0;
const pending = new Map<number, { req: AIRequest; resolve: (t: Thought) => void }>();

const thinkHere = (r: AIRequest) => think(r.state, r.player, r.difficulty, Math.random);

function getWorker(): Worker | null {
  if (broken || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('./engine/ai.worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<AIResponse>) => {
        pending.get(e.data.id)?.resolve(e.data.thought);
        pending.delete(e.data.id);
      };
      worker.onerror = () => {
        broken = true;
        worker = null;
        for (const { req, resolve } of pending.values()) resolve(thinkHere(req));
        pending.clear();
      };
    } catch {
      broken = true;
      return null;
    }
  }
  return worker;
}

/** Ask a bot (or the hint coach, for seat 0) what to play. Search runs off the main thread. */
export function askAI(state: GameState, player: number, difficulty: Difficulty): Promise<Thought> {
  const req: AIRequest = { id: ++seq, state, player, difficulty };
  const w = getWorker();
  if (!w) return new Promise((resolve) => setTimeout(() => resolve(thinkHere(req)), 0));
  return new Promise((resolve) => {
    pending.set(req.id, { req, resolve });
    w.postMessage(req);
  });
}
