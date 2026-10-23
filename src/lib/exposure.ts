import { unitFacades } from "@/components/building3d/plan";
import { SEASONS, compassPoint, facadeBearing, sunHours, type Season } from "./sun";
import type { BuildingPlan } from "./types";

/* An apartment's exposure: the compass points its windows face, and its potential hours of direct sun on the
   solstices and the equinox. */

export interface UnitSun {
  /** Compass points (0 = N, 2 = E, …) of the façades with its windows, the sunniest first. */
  facing: number[];
  hours: Record<Season, number>;
}

export function unitSun(plan: BuildingPlan, unitId: string, lat: number, lng: number): UnitSun | null {
  if (plan.facing === undefined) return null;
  const bearings = unitFacades(plan, unitId).map((f) => facadeBearing(f.normal, plan.facing!));
  if (!bearings.length) return null;
  const hours = Object.fromEntries(SEASONS.map((s) => [s, sunHours(bearings, s, lat, lng)])) as Record<Season, number>;
  // South first, then the sides, north last.
  const facing = [...new Set(bearings.map(compassPoint))].sort((a, b) => Math.abs(4 - a) - Math.abs(4 - b));
  return { facing, hours };
}

/** Every apartment of a building's plan. */
export function buildingSun(plan: BuildingPlan, lat: number, lng: number): Record<string, UnitSun> {
  const out: Record<string, UnitSun> = {};
  for (const f of plan.floors)
    for (const u of f.units) {
      const s = unitSun(plan, u.unitId, lat, lng);
      if (s) out[u.unitId] = s;
    }
  return out;
}
