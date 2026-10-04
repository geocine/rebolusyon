/** Vibration feedback on devices that support it (Android browsers; iOS Safari ignores it). */
let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

function buzz(pattern: number | number[]) {
  if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* some browsers throw when called without a user gesture */
  }
}

export const haptic = {
  tap: () => buzz(8),
  play: () => buzz(18),
  turn: () => buzz([12, 60, 12]),
  error: () => buzz([30, 40, 30]),
  revolution: () => buzz([40, 50, 80, 50, 120]),
  win: () => buzz([20, 40, 20, 40, 60]),
};
