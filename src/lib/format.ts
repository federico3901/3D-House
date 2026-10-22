import { dictionaries } from "@/i18n/dictionaries";
import type { L10n, Locale } from "./types";

export const tr = (text: L10n | undefined, locale: Locale) => (text ? text[locale] || text.it : "");

/** "2027-07" → "luglio 2027" / "July 2027" */
export function monthYear(ym: string, locale: Locale): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return `${dictionaries[locale].months[m - 1]} ${y}`;
}

/** "2026-10-14" → "14 ottobre 2026" / "14 October 2026" */
export function longDate(ymd: string, locale: Locale): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return `${d} ${dictionaries[locale].months[m - 1]} ${y}`;
}

/** "2026-10-14" → "14.10.26", the way dates are written on site boards and in site diaries. */
export function shortDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  return d && m && y ? `${d}.${m}.${y.slice(2)}` : ymd;
}

export const floorLabel = (floor: number, locale: Locale) =>
  floor === 0 ? dictionaries[locale].groundFloor : locale === "it" ? `${floor}°` : ordinal(floor);

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** Text colour that reads on a given background colour (#rrggbb). */
export function inkOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return "#141716";
  const n = parseInt(m[1], 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.36 ? "#141716" : "#ffffff";
}
