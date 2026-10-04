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

const INK = '#221a15';
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
    palette: { H: '#3b2a20', S: '#d99a6c', s: '#b4744a', B: '#f3e9d8' },
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
    palette: { H: '#dcd8e4', h: '#a9a3b8', S: '#d9a070', s: '#b57a4c', K: '#8a5a2b', W: '#e4f2ff', C: '#ee8a78', B: '#93b38c', b: '#6c8c66', P: '#fff6e0' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 7, y: 12, w: 2, color: '#7a2e20' },
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
    palette: { C: '#cf6a3f', c: '#9e4a2a', Y: '#d4a24c', H: '#221a15', S: '#c98a5a', s: '#a46a3e', J: '#d4a24c', N: INK },
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
    palette: { H: '#2a1f1c', h: '#4a3a33', S: '#e8b48a', s: '#c48a62', D: '#d4a24c', d: '#b98a3e', B: '#4d6b80' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 7, y: 11, w: 2, color: '#7a2e20' },
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
    palette: { H: '#3e2530', h: '#6a3f4c', S: '#d9a070', s: '#b57a4c', K: INK, C: '#ee8a78', F: '#cf6a3f', f: '#d4a24c', B: '#c08a96', b: '#93606d' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 6, y: 11, w: 4, color: '#b8392a' },
    fx: [
      {
        className: 'fx-earrings',
        palette: { R: '#d4a24c' },
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
  AJ: {
    rows: [
      '......HHHH......',
      '.....HHhHHH.....',
      '......HHHH......',
      '....HHHHHHHH....',
      '...HHHHHHHHHH...',
      '...HHHhHHhHHH...',
      '...HSSSSSSSSH...',
      '...HSSSSSSSSH...',
      '...HSSSSSSSSH...',
      '...SSSSSSSSSS...',
      '...SCSSSSSSCS...',
      '...sSSSSSSSSs...',
      '....SSSSSSSS....',
      '.....sSSSSs.....',
      '..BBBAAAAAABBB..',
      '.BBBBAAAAAABBBB.',
    ],
    palette: { H: '#3a2418', h: '#5e3c28', S: '#d29a6a', s: '#ae744a', C: '#ee8a78', B: '#4fb6b0', A: '#f3e9d8' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 7, y: 11, w: 2, color: '#7a2e20' },
    fx: [
      {
        className: 'fx-fidget',
        palette: { Y: '#e8c04a', e: '#e58fa0' },
        rows: ['............e...', '...........Y....', '..........Y.....', ...Array(13).fill('................')],
      },
    ],
    quirk: 'q-fidget',
  },
  TB: {
    rows: [
      '................',
      '................',
      '.....SSSSSS.....',
      '....SSSSSSSS....',
      '...HFFFFFFFFH...',
      '...HLLFSSFLLH...',
      '...HFFFSSFFFH...',
      '...HSSSSSSSSH...',
      '...HSSSSSSSSH...',
      '...SSSSSSSSSS...',
      '...SSSSSSSSSS...',
      '...sSMMMMMMSs...',
      '....SSSSSSSS....',
      '.....sSSSSs.....',
      '..BBBBWssWBBBB..',
      '.BBBBBBbBBBBBBB.',
    ],
    palette: { H: '#2b211c', S: '#c98a5a', s: '#a46a3e', F: '#221a15', L: '#3f6b8a', M: '#2b211c', W: '#f3e9d8', B: '#6f8fe0', b: '#4f6cb8' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 6, y: 12, w: 4, color: '#fff6e0' },
    fx: [
      {
        className: 'fx-glint',
        palette: { G: '#ffffff' },
        rows: [...Array(5).fill('................'), '....G.....G.....', ...Array(10).fill('................')],
      },
    ],
    quirk: 'q-glint',
  },
  BE: {
    rows: [
      '.....KKKKKK.....',
      '....K.HHHH.K....',
      '...K.HHHHHH.K...',
      '...KHHHHPPHHK...',
      '...KHHHHHPPHK...',
      '..RRHSSSSSSHRR..',
      '..RRSSSSSSSSRR..',
      '..RRSSSSSSSSRR..',
      '...HSSSSSSSSH...',
      '...HSSSSSSSSH...',
      '...HSCSSSSCSH...',
      '...HsSSSSSSsH...',
      '....HSSSSSSH....',
      '.....sSSSSs.....',
      '..BBBBBssBBBBB..',
      '.BBBBDBBBBDBBBB.',
    ],
    palette: { K: '#ece4f2', R: '#ece4f2', H: '#241a22', P: '#e0608a', S: '#e2ab80', s: '#bf8458', C: '#ee8a78', B: '#e0608a', D: '#f3e9d8' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 7, y: 11, w: 2, color: '#7a2e20' },
    quirk: 'q-bop',
  },
  MC: {
    rows: [
      '................',
      '......hhhh......',
      '....HHHhhhHH....',
      '...HHHHHHHHHH...',
      '...HHHHHHHHHHc..',
      '...HSSSSSSSSHc..',
      '...HSSSSSSSSH...',
      '...SHHSSSSHHS...',
      '...SSSSSSSSSS...',
      '...SSSSSSSSSS...',
      '...SSSSSSSSSS...',
      '...sSMMSSMMSs...',
      '....SSSSSSSS....',
      '.....sSSSSs.....',
      '..WWWWWssWWWWW..',
      '.WWWWVWWWWVWWWW.',
    ],
    palette: { H: '#8a8494', h: '#c9c4d0', c: '#a083d6', S: '#c08458', s: '#9c6440', M: '#4a4450', W: '#f3e9d8', V: '#a083d6' },
    eyes: [
      [5, 8],
      [10, 8],
    ],
    mouth: { x: 7, y: 12, w: 2, color: '#7a2e20' },
    quirk: 'q-dart',
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
const DELAYS: Record<string, string> = { YOU: '-0.4s', LN: '-1.7s', KJ: '-3.1s', MK: '-2.2s', TC: '-0.9s', AJ: '-2.7s', TB: '-1.2s', BE: '-3.5s', MC: '-0.6s' };

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
