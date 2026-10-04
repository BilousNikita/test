/**
 * Generates stylized flat-lay garment illustrations (SVG -> WebP via sharp) for placeholder
 * products and brand imagery. Replace them with real photography in production.
 * No text is rendered (server-side SVG fonts vary between systems).
 */
import sharp from "sharp";

export type Garment = "tee" | "hoodie" | "zip-hoodie" | "shorts" | "pants" | "cargo" | "cap" | "tote";

const W = 1200;
const H = 1500;

function shade(hex: string, amt: number) {
  const n = hex.replace("#", "");
  const v =
    n.length === 3
      ? n
          .split("")
          .map((c) => c + c)
          .join("")
      : n;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + amt * 255)));
  return `#${[r, g, b].map((c) => f(c!).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string) {
  const v = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

const SHAPES: Record<
  Garment,
  { body: string; extras: (c: string, d: string) => string; mark?: [number, number, number] }
> = {
  tee: {
    body: "M455 300 C520 340 680 340 745 300 L900 360 L1010 560 L885 625 L830 545 L830 1230 C700 1245 500 1245 370 1230 L370 545 L315 625 L190 560 L300 360 Z",
    extras: (_c, d) =>
      `<path d="M455 300 C520 385 680 385 745 300" fill="none" stroke="${d}" stroke-width="14"/>
       <path d="M370 545 L370 560 M830 545 L830 560" stroke="${d}" stroke-width="6"/>`,
    mark: [600, 520, 46],
  },
  hoodie: {
    body: "M430 330 L770 330 L930 390 L1040 900 L1010 1110 L900 1110 L880 900 L850 640 L850 1250 L350 1250 L350 640 L320 900 L300 1110 L190 1110 L160 900 L270 390 Z",
    extras: (_c, d) =>
      `<path d="M430 330 C410 170 790 170 770 330 C720 410 480 410 430 330 Z" fill="${shade(d, 0.06)}"/>
       <path d="M470 330 C470 240 730 240 730 330 C700 370 500 370 470 330 Z" fill="${shade(d, -0.08)}"/>
       <path d="M560 380 L550 560 M640 380 L650 560" stroke="${shade(d, 0.25)}" stroke-width="8" stroke-linecap="round"/>
       <path d="M450 950 L750 950 L800 1130 L400 1130 Z" fill="${d}" opacity="0.55"/>
       <rect x="350" y="1205" width="500" height="45" fill="${d}" opacity="0.6"/>
       <rect x="190" y="1070" width="110" height="40" fill="${d}" opacity="0.6"/>
       <rect x="900" y="1070" width="110" height="40" fill="${d}" opacity="0.6"/>`,
    mark: [600, 640, 52],
  },
  "zip-hoodie": {
    body: "M430 330 L770 330 L930 390 L1040 900 L1010 1110 L900 1110 L880 900 L850 640 L850 1250 L350 1250 L350 640 L320 900 L300 1110 L190 1110 L160 900 L270 390 Z",
    extras: (_c, d) =>
      `<path d="M430 330 C410 170 790 170 770 330 C720 410 480 410 430 330 Z" fill="${shade(d, 0.06)}"/>
       <path d="M470 330 C470 240 730 240 730 330 C700 370 500 370 470 330 Z" fill="${shade(d, -0.08)}"/>
       <path d="M600 380 L600 1250" stroke="${shade(d, 0.3)}" stroke-width="10"/>
       <path d="M420 960 L540 960 L560 1120 L400 1120 Z M660 960 L780 960 L800 1120 L640 1120 Z" fill="${d}" opacity="0.5"/>
       <rect x="350" y="1205" width="500" height="45" fill="${d}" opacity="0.6"/>`,
  },
  shorts: {
    body: "M340 430 L860 430 L920 1000 L640 1030 L600 720 L560 1030 L280 1000 Z",
    extras: (_c, d) =>
      `<rect x="340" y="430" width="520" height="70" fill="${d}" opacity="0.6"/>
       <path d="M560 470 L540 600 M640 470 L660 600" stroke="${shade(d, 0.3)}" stroke-width="8" stroke-linecap="round"/>
       <path d="M300 940 L560 965 M900 940 L640 965" stroke="${d}" stroke-width="10" opacity="0.6"/>`,
    mark: [790, 900, 30],
  },
  pants: {
    body: "M400 220 L800 220 L860 1330 L650 1340 L600 560 L550 1340 L340 1330 Z",
    extras: (_c, d) =>
      `<rect x="400" y="220" width="400" height="55" fill="${d}" opacity="0.6"/>
       <path d="M600 275 L600 520" stroke="${d}" stroke-width="8" opacity="0.7"/>
       <path d="M480 280 L460 900 M720 280 L740 900" stroke="${d}" stroke-width="5" opacity="0.4"/>`,
  },
  cargo: {
    body: "M400 220 L800 220 L860 1330 L650 1340 L600 560 L550 1340 L340 1330 Z",
    extras: (_c, d) =>
      `<rect x="400" y="220" width="400" height="55" fill="${d}" opacity="0.6"/>
       <rect x="345" y="700" width="150" height="190" fill="${d}" opacity="0.45"/>
       <rect x="705" y="700" width="150" height="190" fill="${d}" opacity="0.45"/>
       <rect x="345" y="700" width="150" height="45" fill="${d}" opacity="0.4"/>
       <rect x="705" y="700" width="150" height="45" fill="${d}" opacity="0.4"/>`,
  },
  cap: {
    body: "M330 820 C330 470 870 470 870 820 Z",
    extras: (c, d) =>
      `<path d="M330 820 C330 905 1000 940 1060 860 C1010 815 880 800 830 820 Z" fill="${shade(c, -0.08)}"/>
       <circle cx="600" cy="560" r="22" fill="${d}"/>
       <path d="M600 560 L600 820 M460 600 L430 820 M740 600 L770 820" stroke="${d}" stroke-width="5" opacity="0.5"/>`,
    mark: [600, 715, 40],
  },
  tote: {
    body: "M360 560 L840 560 L860 1200 L340 1200 Z",
    extras: (c, d) =>
      `<path d="M450 565 C450 290 610 290 610 565 M590 565 C590 290 750 290 750 565" fill="none" stroke="${shade(c, -0.1)}" stroke-width="30"/>
       <rect x="360" y="560" width="480" height="40" fill="${d}" opacity="0.4"/>`,
    mark: [600, 880, 70],
  },
};

export function garmentSvg(opts: { garment: Garment; color: string; bg?: string; back?: boolean }) {
  const { garment, color } = opts;
  const bg = opts.bg ?? "#ece9e2";
  const shape = SHAPES[garment];
  const dark = shade(color, luminance(color) > 0.5 ? -0.14 : -0.06);
  const markColor = luminance(color) > 0.5 ? "#111111" : "#f3f1ec";
  const mark = shape.mark
    ? (() => {
        const [x, y, r] = opts.back ? [shape.mark[0], shape.mark[1] + 120, shape.mark[2] * 3] : shape.mark;
        return `<g fill="none" stroke="${markColor}" stroke-width="${Math.max(6, r / 7)}">
          <rect x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}"/>
          <circle cx="${x}" cy="${y}" r="${r * 0.55}"/></g>`;
      })()
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${shade(bg, 0.03)}"/><stop offset="1" stop-color="${shade(bg, -0.05)}"/></radialGradient>
    <linearGradient id="sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.14"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g transform="${opts.back ? `translate(${W} 0) scale(-1 1)` : ""}">
    <path d="${shape.body}" fill="#000" opacity="0.18" filter="url(#blur)" transform="translate(18 34)"/>
    <path d="${shape.body}" fill="${color}"/>
    ${shape.extras(color, dark)}
    <path d="${shape.body}" fill="url(#sh)"/>
    ${mark}
  </g>
</svg>`;
}

export async function renderGarment(opts: Parameters<typeof garmentSvg>[0]): Promise<Buffer> {
  return sharp(Buffer.from(garmentSvg(opts)))
    .webp({ quality: 82 })
    .toBuffer();
}

/** Close-up crop (fabric/detail shot) of a rendered garment. */
export async function renderDetail(opts: Parameters<typeof garmentSvg>[0]): Promise<Buffer> {
  const png = await sharp(Buffer.from(garmentSvg(opts)))
    .png()
    .toBuffer();
  return sharp(png)
    .extract({ left: 300, top: 380, width: 600, height: 750 })
    .resize(W, H)
    .webp({ quality: 82 })
    .toBuffer();
}

/** Wide editorial composition: several garments on a coloured backdrop. */
export async function renderComposition(opts: {
  width: number;
  height: number;
  bg: string;
  accent?: string;
  items: { garment: Garment; color: string; x: number; y: number; scale: number; rotate?: number }[];
}): Promise<Buffer> {
  const { width, height, bg, accent } = opts;
  const groups = opts.items
    .map((it) => {
      const inner = garmentSvg({ garment: it.garment, color: it.color, bg: "#00000000" })
        .replace(/<rect width="1200" height="1500" fill="url\(#bg\)"\/>/, "")
        .replace(/^<svg[^>]*>/, "")
        .replace(/<\/svg>$/, "");
      return `<g transform="translate(${it.x} ${it.y}) rotate(${it.rotate ?? 0} 600 750) scale(${it.scale})">${inner}</g>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="${bg}"/>
    ${accent ? `<rect x="${width * 0.62}" y="0" width="${width * 0.38}" height="${height}" fill="${accent}"/>` : ""}
    ${groups}
  </svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer();
}
