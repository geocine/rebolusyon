import { runs } from './PixelAvatar';

/**
 * 12×16 pixel busts for the court cards. `X` paints in the suit colour, so each portrait is
 * a two-tone print plus gold, like the court art on a real deck.
 */
export const COURTS: Record<'J' | 'Q' | 'K', readonly string[]> = {
  J: [
    '.....GG.....',
    '....GGGG....',
    '..GGGGGGGG..',
    'GGGGGGGGGGGG',
    '.XXSSSSSSXX.',
    '.XSKSSSSKSX.',
    '.XSSSSSSSSX.',
    '.XSSSXXSSSX.',
    '..XSSSSSSX..',
    '....SSSS....',
    '..XXWSSWXX..',
    '.XXXXWWXXXX.',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
  ],
  Q: [
    '....GGGG....',
    '...GWGGWG...',
    '..XXXXXXXX..',
    '.XXSSSSSSXX.',
    '.XSSSSSSSSX.',
    '.XSKSSSSKSX.',
    '.XSSSSSSSSX.',
    '.XSSSXXSSSX.',
    '.XXSSSSSSXX.',
    '.XXXXSSXXXX.',
    'XXXXSSSSXXXX',
    'GGXXXSSXXXGG',
    'GXXXXXXXXXXG',
    '.XXXXXXXXXX.',
    '..XXXXXXXX..',
    '..XXXXXXXX..',
  ],
  K: [
    '.G..G..G..G.',
    '.GGGGGGGGGG.',
    '.GGXGGGGXGG.',
    '.XSSSSSSSSX.',
    '.XSSSSSSSSX.',
    '.XSKSSSSKSX.',
    '.XSSSSSSSSX.',
    '.XSXXXXXXSX.',
    '.XXXSSSSXXX.',
    '..XXXXXXXX..',
    '...XXXXXX...',
    '.GGGWWWWGGG.',
    'GXXXXXXXXXXG',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
    'XXXXXXXXXXXX',
  ],
};

export const COURT_PALETTE: Record<string, string> = {
  X: 'currentColor',
  G: '#c69443',
  S: '#f3d9b8',
  K: '#221a15',
  W: '#fffaf0',
};

const compiled = Object.fromEntries(Object.entries(COURTS).map(([k, rows]) => [k, runs(rows, COURT_PALETTE)]));

export function CourtArt({ rank }: { rank: 'J' | 'Q' | 'K' }) {
  return (
    <svg className="court-art" viewBox="0 0 12 16" preserveAspectRatio="xMidYMax meet" shapeRendering="crispEdges" aria-hidden="true">
      {compiled[rank].map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
