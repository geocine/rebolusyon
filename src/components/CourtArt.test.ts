import { describe, expect, it } from 'vitest';
import { COURTS, COURT_PALETTE } from './CourtArt';

describe('court art', () => {
  it('is a 12×16 grid drawn only with the court palette', () => {
    for (const [rank, rows] of Object.entries(COURTS)) {
      expect(rows, rank).toHaveLength(16);
      for (const row of rows) {
        expect(row, `${rank}: "${row}"`).toHaveLength(12);
        for (const ch of row) if (ch !== '.') expect(COURT_PALETTE[ch], `${rank}: ${ch}`).toBeDefined();
      }
    }
  });
});
