import grazioli57 from "./demo/maps/grazioli-57.json";

/* Neighbourhoods made by scripts/build-map.mjs: the drawing (an SVG in public/), and the services around the project
   with their walking times. Positions are in the drawing's units (viewBox). */
export type ServiceCategory = "transport" | "school" | "shop" | "health" | "park" | "sport";

export interface Service {
  cat: ServiceCategory;
  /** metro, train, tram, bus, kindergarten, school, university, supermarket, market, pharmacy, hospital, doctors, park, sport */
  kind: string;
  name: string;
  /** Walking distance along streets and footpaths. */
  meters: number;
  minutes: number;
  at: number[];
}

export interface AreaMapData {
  svg: string;
  viewBox: number[];
  pin: number[];
  attribution: string;
  services: Service[];
}

export const CATEGORIES: ServiceCategory[] = ["transport", "shop", "school", "health", "park", "sport"];

/** The nearest service of each category; for transport the nearest station counts more than the nearest bus stop. */
export function nearestByCategory(services: Service[]): Service[] {
  return CATEGORIES.flatMap((cat) => {
    const own = services.filter((s) => s.cat === cat).sort((a, b) => a.minutes - b.minutes);
    const pick = (cat === "transport" && own.find((s) => s.kind !== "bus")) || own[0];
    return pick ? [pick] : [];
  });
}

export const maps: Record<string, AreaMapData> = {
  "grazioli-57": grazioli57 as AreaMapData,
};
