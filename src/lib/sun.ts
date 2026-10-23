/* Where the sun is, and how much of it an apartment can get. The sun's position follows the formulas of the
   Astronomical Almanac as simplified by NOAA and SunCalc (accurate to a fraction of a degree, plenty for this).
   Hours of sun are potential: the sun above the horizon and in front of one of the apartment's windowed façades,
   without the shade of neighbouring buildings or trees. */

const RAD = Math.PI / 180;
const OBLIQUITY = 23.4397 * RAD;

export interface SunPosition {
  /** Compass bearing, degrees clockwise from north. */
  azimuth: number;
  /** Degrees above the horizon. */
  altitude: number;
}

export function sunPosition(date: Date, lat: number, lng: number): SunPosition {
  const d = date.getTime() / 86400000 + 2440587.5 - 2451545;
  const M = (357.5291 + 0.98560028 * d) * RAD;
  const C = (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) * RAD;
  const L = M + C + (180 + 102.9372) * RAD;
  const dec = Math.asin(Math.sin(OBLIQUITY) * Math.sin(L));
  const ra = Math.atan2(Math.sin(L) * Math.cos(OBLIQUITY), Math.cos(L));
  const H = (280.16 + 360.9856235 * d + lng) * RAD - ra;
  const phi = lat * RAD;
  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const fromSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  return { azimuth: (fromSouth / RAD + 180 + 360) % 360, altitude: altitude / RAD };
}

/* ---------------------------------------------------------------- days and clock */

export type Season = "winter" | "equinox" | "summer";
export const SEASONS: Season[] = ["winter", "equinox", "summer"];
/** Solstices and equinox: month (1–12) and day. */
const SEASON_DAY: Record<Season, [number, number]> = { winter: [12, 21], equinox: [3, 21], summer: [6, 21] };

/** Offset of Italian clock time from UTC on a date: summer time from the last Sunday of March to the last of October. */
export function italyOffset(year: number, month: number, day: number): number {
  const lastSunday = (m: number) => 31 - new Date(Date.UTC(year, m - 1, 31)).getUTCDay();
  const start = lastSunday(3);
  const end = lastSunday(10);
  const after = month > 3 || (month === 3 && day >= start);
  const before = month < 10 || (month === 10 && day < end);
  return after && before ? 2 : 1;
}

/** The instant of a clock time (hours, e.g. 13.5) in Italy on a season's day. */
export function seasonTime(season: Season, hours: number, year = 2026): Date {
  const [m, d] = SEASON_DAY[season];
  return new Date(Date.UTC(year, m - 1, d, 0, 0, 0) + (hours - italyOffset(year, m, d)) * 3600000);
}

/** Sunrise and sunset of a season's day, in Italian clock hours. */
export function daylight(season: Season, lat: number, lng: number): { rise: number; set: number } {
  let rise = 12;
  let set = 12;
  for (let h = 3; h <= 23; h += 1 / 60) {
    if (sunPosition(seasonTime(season, h), lat, lng).altitude > -0.833) {
      if (rise === 12) rise = h;
      set = h;
    }
  }
  return { rise, set };
}

/* ---------------------------------------------------------------- façades */

/** Bearing a façade faces, from its outward normal in plan coordinates (x along the front, y towards the back) and
    the bearing the front façade faces. */
export function facadeBearing([nx, ny]: [number, number], front: number): number {
  return (((front + Math.atan2(-nx, -ny) / RAD) % 360) + 360) % 360;
}

/** Light falling on a façade: 0 in shade, 1 with the sun square to it. */
export function facadeLight(bearing: number, sun: SunPosition): number {
  if (sun.altitude <= 0) return 0;
  const cos = Math.cos((sun.azimuth - bearing) * RAD) * Math.cos(sun.altitude * RAD);
  return Math.max(0, cos);
}

/** Potential hours of direct sun on a day for windows facing these bearings. */
export function sunHours(bearings: number[], season: Season, lat: number, lng: number): number {
  if (!bearings.length) return 0;
  const step = 1 / 12;
  let hours = 0;
  for (let h = 3; h <= 23; h += step) {
    const sun = sunPosition(seasonTime(season, h), lat, lng);
    // Low sun skims the façade or is lost behind the city: count it from 5° up and 10° off the wall.
    if (sun.altitude > 5 && bearings.some((b) => Math.cos((sun.azimuth - b) * RAD) > 0.17)) hours += step;
  }
  return Math.round(hours * 2) / 2;
}

/** The eight compass points, for labels: 0 = N, 1 = NE, … */
export const compassPoint = (bearing: number) => Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
