import { describe, expect, it } from 'vitest';
import { PERSONAS, REGULARS } from '../engine/ai';
import { HOST } from '../tutorial';
import { SPRITES } from './PixelAvatar';

describe('pixel sprites', () => {
  it('covers every character who can sit at the table', () => {
    for (const p of [...PERSONAS, ...REGULARS, HOST]) expect(SPRITES[p.initials], p.name).toBeDefined();
  });

  it('are 16×16 grids drawn only with their own palette', () => {
    for (const [id, s] of Object.entries(SPRITES)) {
      const layers = [{ rows: s.rows, palette: s.palette }, ...(s.fx ?? [])];
      for (const { rows, palette } of layers) {
        expect(rows, id).toHaveLength(16);
        for (const row of rows) {
          expect(row, `${id}: "${row}"`).toHaveLength(16);
          for (const ch of row) if (ch !== '.') expect(palette[ch], `${id}: ${ch}`).toBeDefined();
        }
      }
      for (const [x, y] of s.eyes) expect(s.palette[s.rows[y][x]], `${id} eye sits on the face`).toBeDefined();
    }
  });
});
