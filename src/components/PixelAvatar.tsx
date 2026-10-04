import { memo } from 'react';

/**
 * Hand-drawn 16×16 portraits. Each row is 16 characters; `.` is transparent and every other
 * character is looked up in the sprite's palette. Rows 14–15 are the body, which stays still
 * while the head bobs over it.
 */
interface Layer {
  rows: readonly string[];
  palette: Record<string, string>;
  className: string;
}

export interface Sprite {
  rows: readonly string[];
  palette: Record<string, string>;
  /** Top pixel of each 1×2 eye. */
  eyes: [number, number][];
  mouth: { x: number; y: number; w: number; color: string };
  fx?: Layer[];
  /** Signature motion, see `.q-*` in styles.css. */
  quirk: string;
}

const INK = '#1d1b30';
export const BODY_ROW = 14;

export const SPRITES: Record<string, Sprite> = {
  YOU: {
    rows: [
      '................',
      '................',
      '.....HHHHHH.....',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHSHHHSHHH...',
      '...HSSSSSSSSH...',
      '...SSSSSSSSSS...',
      '...SSSSSSSSSS...',
      '...SSSSSSSSSS...',
      '...SSSSSSSSSS...',
      '...sSSSSSSSSs...',
      '....SSSSSSSS....',
      '.....sSSSSs.....',
      '..BBBBBssBBBBB..',
      '.BBBBBBBBBBBBBB.',
    ],
    palette: { H: '#3b2a20', S: '#d99a6c', s: '#b4744a', B: '#f6efe1' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 7, y: 11, w: 2, color: '#7a2a1e' },
    fx: [
      {
        className: 'fx-tuft',
        palette: { H: '#3b2a20' },
        rows: ['........H.......', '.......HH.......', ...Array(14).fill('................')],
      },
    ],
    quirk: 'q-tuft',
  },
  LN: {
    rows: [
      '......HHHH......',
      '.....HhHHhH.....',
      '......hHHh......',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '..HHSSSSSSSSHH..',
      '..HSSSSSSSSSSH..',
      '..HKKKKSSKKKKH..',
      '..HKWWKKKKWWKH..',
      '..HKWWKSSKWWKH..',
      '..HKKKKSSKKKKH..',
      '..HSCSSSSSSCSH..',
      '...SSSSSSSSSS...',
      '....sSSSSSSs....',
      '..BBBPBPPBPBBB..',
      '.BBBBbBBBBbBBBB.',
    ],
    palette: { H: '#dcd8e4', h: '#a9a3b8', S: '#d9a070', s: '#b57a4c', K: '#8a5a2b', W: '#e4f2ff', C: '#ee8a78', B: '#3fd0a8', b: '#279b7c', P: '#fff6e0' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 7, y: 12, w: 2, color: '#8c2f22' },
    fx: [
      {
        className: 'fx-glint',
        palette: { G: '#ffffff' },
        rows: [...Array(8).fill('................'), '....G...........', '...........G....', ...Array(6).fill('................')],
      },
    ],
    quirk: 'q-glint',
  },
  KJ: {
    rows: [
      '................',
      '.....CCCCCC.....',
      '....CCCCYCCC....',
      '...CCCCYYYCCC...',
      '...CCCCCCCCCC...',
      '..ccccccccccccc.',
      '...HSSSSSSSSH...',
      '...SHHSSSSHHS...',
      '...SSSSSSSSSS...',
      '...SSSSSSSSSS...',
      '...sSSSSSSSSs...',
      '...SSSHHHHSSS...',
      '....SSSSSSSS....',
      '.....sSSSSs.....',
      '..JJJJJNNJJJJJ..',
      '.JJJJJJNNJJJJJJ.',
    ],
    palette: { C: '#ff4f8b', c: '#c23468', Y: '#f4b41a', H: '#1d1b30', S: '#c98a5a', s: '#a46a3e', J: '#f4b41a', N: INK },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 6, y: 12, w: 4, color: '#fff6e0' },
    quirk: 'q-groove',
  },
  MK: {
    rows: [
      '................',
      '.....HHHHHH.....',
      '....HHhhHHHH....',
      '...HHhHHHHHHH...',
      '...HHHHHHHHHH...',
      '..HHHHHHHHHHHH..',
      '..HHHHHHHHHHHH..',
      '..HHSSSSSSSSHH..',
      '..HHSSSSSSSSHH..',
      '..HHSSSSSSSSHH..',
      '..HHSSSSSSSSHH..',
      '..HHsSSSSSSsHH..',
      '..HHHsSSSSsHHH..',
      '..DDDDsSSsDDDD..',
      '..dBBBBBBBBBBd..',
      '.BBBBBBBBBBBBBB.',
    ],
    palette: { H: '#2a2440', h: '#4a4070', S: '#e8b48a', s: '#c48a62', D: '#f4b41a', d: '#c98a2b', B: '#2d6e8e' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 7, y: 11, w: 2, color: '#8c2f22' },
    quirk: 'q-dart',
  },
  TC: {
    rows: [
      '...HHHH..HHHH...',
      '..HHHHHHHHHHHFF.',
      '.HHHhHHHHHhHHFfF',
      '.HHHHHHHHHHHHHF.',
      'HHHHHhHHHHhHHHH.',
      'HHHSSSSSSSSSSHHH',
      'HHHSSSSSSSSSSHHH',
      'HHHSKKSSSSKKSHHH',
      'HHHSSSSSSSSSSHHH',
      'HHHSSSSSSSSSSHHH',
      'HHHSCSSSSSSCSHHH',
      'HHHSSSSSSSSSSHHH',
      'HHHHsSSSSSSsHHHH',
      'HHHHHsSSSSsHHHHH',
      '.HBBBBBBBBBBBBH.',
      'BBBBBbBBBBbBBBBB',
    ],
    palette: { H: '#4a2a5e', h: '#6e4590', S: '#d9a070', s: '#b57a4c', K: INK, C: '#ee8a78', F: '#ff4f8b', f: '#f4b41a', B: '#b48cff', b: '#8a62d6' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 6, y: 11, w: 4, color: '#cf3426' },
    fx: [
      {
        className: 'fx-earrings',
        palette: { R: '#f4b41a' },
        rows: [
          ...Array(10).fill('................'),
          '..R..........R..',
          '.R.R........R.R.',
          '..R..........R..',
          ...Array(3).fill('................'),
        ],
      },
    ],
    quirk: 'q-sway',
  },
};

interface Run {
  x: number;
  y: number;
  w: number;
  fill: string;
}

/** Merges horizontal runs of the same colour so each sprite is a few dozen rects, not 256. */
export function runs(rows: readonly string[], palette: Record<string, string>): Run[] {
  const out: Run[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const fill = palette[row[x]];
      if (!fill) {
        x++;
        continue;
      }
      let w = 1;
      while (row[x + w] === row[x]) w++;
      out.push({ x, y, w, fill });
      x += w;
    }
  });
  return out;
}

const Rects = ({ list }: { list: Run[] }) => (
  <>
    {list.map((r) => (
      <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
    ))}
  </>
);

const compiled = new Map<string, { head: Run[]; body: Run[]; fx: { className: string; list: Run[] }[] }>();
function compile(id: string, s: Sprite) {
  let c = compiled.get(id);
  if (!c) {
    const all = runs(s.rows, s.palette);
    c = {
      head: all.filter((r) => r.y < BODY_ROW),
      body: all.filter((r) => r.y >= BODY_ROW),
      fx: (s.fx ?? []).map((l) => ({ className: l.className, list: runs(l.rows, l.palette) })),
    };
    compiled.set(id, c);
  }
  return c;
}

export type AvatarMood = 'happy';

interface Props {
  id: string;
  active?: boolean;
  talking?: boolean;
  mood?: AvatarMood;
}

/** Desynchronises blinks so a table of avatars doesn't blink in unison. */
const DELAYS: Record<string, string> = { YOU: '-0.4s', LN: '-1.7s', KJ: '-3.1s', MK: '-2.2s', TC: '-0.9s' };

export const PixelAvatar = memo(function PixelAvatar({ id, active, talking, mood }: Props) {
  const sprite = SPRITES[id];
  if (!sprite) return null;
  const { head, body, fx } = compile(id, sprite);
  const { mouth } = sprite;
  return (
    <svg
      className={`px ${sprite.quirk} ${active ? 'active' : ''} ${talking ? 'talking' : ''} ${mood ? `mood-${mood}` : ''}`}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ ['--px-delay' as string]: DELAYS[id] ?? '0s' }}
    >
      <g className="px-head">
        <Rects list={head} />
        <g className="px-look">
          <g className="px-eyes-open">
            {sprite.eyes.map(([x, y]) => (
              <rect key={x} x={x} y={y} width={1} height={2} fill={INK} />
            ))}
          </g>
          <g className="px-eyes-closed">
            {sprite.eyes.map(([x, y]) => (
              <rect key={x} x={x - (x < 8 ? 1 : 0)} y={y + 1} width={2} height={1} fill={INK} />
            ))}
          </g>
        </g>
        <g className="px-eyes-happy">
          {sprite.eyes.map(([x, y]) => (
            <g key={x} fill={INK}>
              <rect x={x - 1} y={y + 1} width={1} height={1} />
              <rect x={x} y={y} width={1} height={1} />
              <rect x={x + 1} y={y + 1} width={1} height={1} />
            </g>
          ))}
        </g>
        <rect className="px-mouth-closed" x={mouth.x} y={mouth.y} width={mouth.w} height={1} fill={mouth.color} />
        <g className="px-mouth-open">
          <rect x={mouth.x} y={mouth.y} width={mouth.w} height={1} fill="#3a1020" />
          <rect x={mouth.x} y={mouth.y + 1} width={mouth.w} height={1} fill="#e05a6a" />
        </g>
        {fx.map((l) => (
          <g key={l.className} className={l.className}>
            <Rects list={l.list} />
          </g>
        ))}
      </g>
      <g className="px-body">
        <Rects list={body} />
      </g>
    </svg>
  );
});
