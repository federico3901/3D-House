import grazioli57 from "./demo/maps/grazioli-57.json";

/* Neighbourhood drawings made by scripts/build-map.mjs, rendered on the server only (they are large). */
export interface MapDrawing {
  viewBox: number[];
  pin: number[];
  layers: Record<"buildings" | "parks" | "water" | "rail" | "tram" | "major" | "minor" | "paths", string>;
  labels: { kind: string; text: string; x: number; y: number; angle?: number }[];
  attribution: string;
}

export const maps: Record<string, MapDrawing> = {
  "grazioli-57": grazioli57 as MapDrawing,
};
