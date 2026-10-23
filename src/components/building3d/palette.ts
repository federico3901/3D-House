import { GROUPS, type RoomGroup } from "./plan";

/* The --o-* and --k-* tokens of the viewer (building3d.css), parsed for WebGL. */

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Palette {
  dark: boolean;
  edge: RGBA;
  /** The brand colour: the glow around the selected apartment, and the tint of its rooms. */
  signal: RGBA;
  /** The outline of the selected apartment. */
  select: RGBA;
  ink: RGBA;
  mute: RGBA;
  group: Record<RoomGroup, RGBA>;
  fillAlpha: number;
  tileAlpha: number;
  dimAlpha: number;
  /** Edges hidden behind surfaces, drawn dashed. */
  hiddenAlpha: number;
  /** Strength of the glow around the selected apartment. */
  glow: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function parseColor(s: string, fallback: RGBA): RGBA {
  const v = s.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    const h = m[1];
    const full = h.length <= 4 ? h.split("").map((c) => c + c).join("") : h;
    const n = (i: number) => parseInt(full.slice(i, i + 2), 16) / 255;
    return { r: n(0), g: n(2), b: n(4), a: full.length === 8 ? n(6) : 1 };
  }
  m = /^rgba?\(([^)]+)\)$/.exec(v);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    if (p.slice(0, 3).every(Number.isFinite)) return { r: clamp01(p[0] / 255), g: clamp01(p[1] / 255), b: clamp01(p[2] / 255), a: clamp01(p[3] ?? 1) };
  }
  return fallback;
}

const GREY: RGBA = { r: 0.55, g: 0.55, b: 0.55, a: 1 };

export function readPalette(el: HTMLElement): Palette {
  const css = getComputedStyle(el);
  const v = (name: string) => css.getPropertyValue(name);
  const num = (name: string, fallback: number) => {
    const x = parseFloat(v(name));
    return Number.isFinite(x) ? x : fallback;
  };
  const dark = v("--o-dark").trim() !== "0";
  const group = {} as Record<RoomGroup, RGBA>;
  for (const g of GROUPS) group[g] = parseColor(v(`--k-${g}`), GREY);
  return {
    dark,
    edge: parseColor(v("--o-edge"), { r: 1, g: 1, b: 1, a: 0.6 }),
    signal: parseColor(v("--signal"), { r: 0.95, g: 0.7, b: 0, a: 1 }),
    select: parseColor(v("--o-select"), { r: 0.07, g: 0.08, b: 0.08, a: 1 }),
    ink: parseColor(v("--ink"), { r: 0.9, g: 0.9, b: 0.9, a: 1 }),
    mute: parseColor(v("--mute"), GREY),
    group,
    fillAlpha: num("--o-fill-alpha", 0.12),
    tileAlpha: num("--o-tile-alpha", 0.2),
    dimAlpha: num("--o-dim-alpha", 0.04),
    hiddenAlpha: num("--o-hidden-alpha", 0.12),
    glow: num("--o-glow", 0.45),
  };
}
