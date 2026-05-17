// Pixel art cars. Each sprite is a small grid (top-down view, nose pointing
// +x) with a tiny palette. Drawn via a per-sprite cached offscreen canvas
// so we only rasterize once. Each row is one image row; each char maps to a
// palette index, '.' = transparent.

export type CarSkin =
  | 'classic'      // starter
  | 'racer'        // first unlock
  | 'truck'
  | 'cop'
  | 'taxi'
  | 'ufo'
  | 'banana'
  | 'phantom';

interface SpriteDef {
  palette: string[];
  rows: string[];          // each row uses single chars as palette indices
  pxScale: number;         // world-units per sprite-pixel
}

// All sprites are 13 wide x 21 tall (nose pointing right) — 0deg heading = +x.
// Roughly 26 x 42 world units when pxScale=2.
const PAL_DARK = '#0a0e14';
const PAL_GLASS = '#7fc7ff';
const PAL_GLASS_DARK = '#3a78c7';
const PAL_TIRE = '#1b1f25';
const PAL_WHITE = '#f4f7fa';

const SPRITES: Record<CarSkin, SpriteDef> = {
  classic: {
    palette: [PAL_DARK, '#d23b3b', '#931f1f', PAL_GLASS, PAL_GLASS_DARK, PAL_TIRE, PAL_WHITE],
    pxScale: 2,
    rows: [
      '....00000....',
      '...0111110...',
      '..011111110..',
      '.01122222110.',
      '.01133443110.',
      '.01144444110.',
      '.01111111110.',
      '.05111111150.',
      '.05111111150.',
      '.01111111110.',
      '.01111661110.',
      '.01166666610.',
      '.01111661110.',
      '.01111111110.',
      '.05111111150.',
      '.05111111150.',
      '.01111111110.',
      '.01144334410.',
      '.01133333310.',
      '..011111110..',
      '...0000000...',
    ],
  },
  racer: {
    palette: [PAL_DARK, '#ffd34d', '#a87b00', PAL_GLASS, PAL_GLASS_DARK, PAL_TIRE, '#ff5b5b'],
    pxScale: 2,
    rows: [
      '....00000....',
      '...0111110...',
      '..016666610..',
      '.01166666110.',
      '.01133443110.',
      '.01166666110.',
      '.01111111110.',
      '.05111111150.',
      '.05111661150.',
      '.01166666110.',
      '.01166666110.',
      '.01166666110.',
      '.01166666110.',
      '.01166666110.',
      '.05111661150.',
      '.05111111150.',
      '.01111111110.',
      '.01144334410.',
      '.01166666610.',
      '..011111110..',
      '...0000000...',
    ],
  },
  truck: {
    palette: [PAL_DARK, '#3a8ed1', '#1f4f78', PAL_GLASS, PAL_GLASS_DARK, PAL_TIRE, '#ffd34d'],
    pxScale: 2,
    rows: [
      '....00000....',
      '...0111110...',
      '..011111110..',
      '.01166666110.',
      '.01133443110.',
      '.01111111110.',
      '.01111111110.',
      '.05111111150.',
      '.05111111150.',
      '0011111111100',
      '0111111111110',
      '0111111111110',
      '0111111111110',
      '0111111111110',
      '0511111111150',
      '0511111111150',
      '0011111111100',
      '.01111111110.',
      '.01111111110.',
      '..011111110..',
      '...0000000...',
    ],
  },
  cop: {
    palette: [PAL_DARK, '#0a0e14', '#222d3a', PAL_GLASS, PAL_GLASS_DARK, PAL_TIRE, PAL_WHITE],
    pxScale: 2,
    rows: [
      '....00000....',
      '...0666660...',
      '..066611660..',
      '.06661111660.',
      '.06633443660.',
      '.06611111660.',
      '.06611111660.',
      '.05111111150.',
      '.05133443150.',
      '.06111111160.',
      '.06616666160.',
      '.06661661660.',
      '.06616666160.',
      '.06111111160.',
      '.05133443150.',
      '.05111111150.',
      '.06611111660.',
      '.06633443660.',
      '.06666666660.',
      '..066666660..',
      '...0000000...',
    ],
  },
  taxi: {
    palette: [PAL_DARK, '#f6c517', '#a87b00', PAL_GLASS, PAL_GLASS_DARK, PAL_TIRE, '#222'],
    pxScale: 2,
    rows: [
      '....00000....',
      '...0111110...',
      '..011111110..',
      '.01122222110.',
      '.01133443110.',
      '.01144444110.',
      '.01166666110.',
      '.05666666650.',
      '.05111111150.',
      '.01166666110.',
      '.01166666110.',
      '.01111111110.',
      '.01166666110.',
      '.01166666110.',
      '.05111111150.',
      '.05666666650.',
      '.01166666110.',
      '.01144334410.',
      '.01133333310.',
      '..011111110..',
      '...0000000...',
    ],
  },
  ufo: {
    palette: [PAL_DARK, '#56e1ff', '#1d99c0', PAL_GLASS, PAL_GLASS_DARK, PAL_TIRE, '#b6f5ff'],
    pxScale: 2,
    rows: [
      '....00000....',
      '...0666660...',
      '..066333660..',
      '.06633443660.',
      '.06633443660.',
      '.06633443660.',
      '.06611111660.',
      '01166666666110',
      '01111111111110',
      '01111111111110',
      '06666666666660',
      '01111111111110',
      '01111111111110',
      '01166666666110',
      '.06611111660.',
      '.06633443660.',
      '.06633443660.',
      '.06633443660.',
      '.06633333660.',
      '..066666660..',
      '...0000000...',
    ],
  },
  banana: {
    palette: [PAL_DARK, '#ffd84a', '#a87b00', PAL_GLASS, PAL_GLASS_DARK, PAL_TIRE, '#7a4a00'],
    pxScale: 2,
    rows: [
      '....00000....',
      '...0111166...',
      '..011111166.',
      '.011111111660',
      '.011111111160',
      '.011111111160',
      '.011111111160',
      '.011111111160',
      '.051111111160',
      '.051111111160',
      '.011111111160',
      '.011111111160',
      '.011111111160',
      '.011111111160',
      '.051111111160',
      '.051111111160',
      '.011111111160',
      '.011111111160',
      '.011111111660',
      '..0111111660.',
      '...000000660.',
    ],
  },
  phantom: {
    palette: [PAL_DARK, '#1a1a26', '#0a0a14', '#9070ff', '#ffffff', PAL_TIRE, '#ff7ad9'],
    pxScale: 2,
    rows: [
      '....00000....',
      '...0111110...',
      '..011111110..',
      '.01122222110.',
      '.01133443110.',
      '.01144444110.',
      '.01166666110.',
      '.06111111160.',
      '.06133443160.',
      '.01133443110.',
      '.01166666110.',
      '.01133443110.',
      '.01166666110.',
      '.01133443110.',
      '.06133443160.',
      '.06111111160.',
      '.01166666110.',
      '.01144334410.',
      '.01133333310.',
      '..011111110..',
      '...0000000...',
    ],
  },
};

const CACHE = new Map<CarSkin, HTMLCanvasElement>();

function buildSpriteCanvas(skin: CarSkin): HTMLCanvasElement {
  const def = SPRITES[skin];
  const w = def.rows[0].length;
  const h = def.rows.length;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  const img = c.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const row = def.rows[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      const o = (y * w + x) * 4;
      if (ch === '.') { img.data[o + 3] = 0; continue; }
      const idx = parseInt(ch, 16);
      const hex = def.palette[idx] ?? '#f0f';
      const [r, g, b] = hexToRgb(hex);
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, 0);
  return cv;
}

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function drawCarSprite(
  c: CanvasRenderingContext2D,
  x: number, y: number, heading: number, skin: CarSkin,
) {
  let cv = CACHE.get(skin);
  if (!cv) { cv = buildSpriteCanvas(skin); CACHE.set(skin, cv); }
  const def = SPRITES[skin];
  const sx = def.pxScale;
  c.save();
  c.translate(x, y);
  // sprites point +x (east). Rotate by heading (radians).
  c.rotate(heading);
  // Disable smoothing for crisp pixel look.
  const prev = c.imageSmoothingEnabled;
  c.imageSmoothingEnabled = false;
  c.drawImage(cv, -cv.width * sx / 2, -cv.height * sx / 2, cv.width * sx, cv.height * sx);
  c.imageSmoothingEnabled = prev;
  c.restore();
}

export const ALL_SKINS: CarSkin[] = ['classic', 'racer', 'truck', 'cop', 'taxi', 'ufo', 'banana', 'phantom'];
