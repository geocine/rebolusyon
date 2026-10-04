/// <reference lib="webworker" />
import { think } from './search';
import type { AIRequest, AIResponse } from '../aiClient';

self.onmessage = (e: MessageEvent<AIRequest>) => {
  const { id, state, player, difficulty } = e.data;
  const thought = think(state, player, difficulty, Math.random);
  const res: AIResponse = { id, thought };
  self.postMessage(res);
};
