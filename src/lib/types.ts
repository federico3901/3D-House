/* The data model of one impresa's site. Everything the public pages show comes from a TenantData object:
   the built-in one in src/tenants/<id>/, or the copy edited in the admin panel (saved in the browser). */

export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];

/** A text in every supported language. */
export type L10n = Record<Locale, string>;

export interface Brand {
  name: string;
  /** Two or three letters for the logo mark. */
  monogram: string;
  tagline: L10n;
  /** Brand colour as #rrggbb: buttons, progress bars, highlights. */
  color: string;
  city: string;
  email: string;
  phone: string;
  address: string;
  vat: string;
  foundedYear: number;
}

export type ProjectStatus = "planning" | "construction" | "completed";
export type UnitStatus = "available" | "reserved" | "sold";

export interface Phase {
  id: string;
  name: L10n;
  /** 0–100 */
  progress: number;
  /** Share of the whole job, used to weigh the overall progress. */
  weight: number;
  /** "YYYY-MM" */
  start: string;
  end: string;
}

export interface SiteUpdate {
  id: string;
  /** "YYYY-MM-DD" */
  date: string;
  phaseId?: string;
  title: L10n;
  body: L10n;
  image?: string;
}

export interface Unit {
  id: string;
  name: string;
  /** 0 = piano terra */
  floor: number;
  rooms: number;
  bathrooms: number;
  /** m² commerciali */
  area: number;
  outdoor?: { kind: "terrace" | "balcony" | "garden"; area: number };
  status: UnitStatus;
  /** Euro; null = "su richiesta" */
  price: number | null;
}

export interface Hotspot {
  /** Position on the panorama image, 0–1 from the left edge and from the top edge. */
  x: number;
  y: number;
  target: string;
  label: L10n;
}

export interface PanoramaScene {
  id: string;
  title: L10n;
  image: string;
  thumb: string;
  /** Where the view opens, 0–1 from the left edge of the panorama. */
  startX: number;
  hotspots: Hotspot[];
}

export type Tour =
  | { id: string; kind: "panorama"; title: L10n; scenes: PanoramaScene[] }
  /** A tour hosted elsewhere (Matterport, Kuula, …), shown in an iframe. */
  | { id: string; kind: "embed"; title: L10n; url: string };

export interface Photo {
  src: string;
  alt: L10n;
}

export interface Project {
  slug: string;
  name: string;
  subtitle: L10n;
  status: ProjectStatus;
  location: {
    address: string;
    district: string;
    city: string;
    lat: number;
    lng: number;
    approximate: boolean;
  };
  cover: Photo;
  gallery: Photo[];
  summary: L10n;
  description: L10n;
  facts: { label: L10n; value: L10n }[];
  features: L10n[];
  /** "YYYY-MM" */
  start: string;
  delivery: string;
  phases: Phase[];
  updates: SiteUpdate[];
  units: Unit[];
  tours: Tour[];
  /** Id of the map drawing in src/tenants/<id>/maps, if any. */
  map?: string;
  /** Id of the building plan in src/tenants/plans.ts, if any: it drives the 3D view. Phases of one building share it. */
  building?: string;
  sources: { label: string; url: string }[];
  note?: L10n;
}

export interface TenantData {
  /** Bumped when the shape changes, so an old copy saved in a browser is ignored. */
  version: number;
  id: string;
  brand: Brand;
  projects: Project[];
  /** Shown site-wide when set (e.g. "this is a demo"). */
  notice?: L10n;
}

/* Building plans: the floor plan as data, from which the 3D view is built. Lengths in metres; x runs along the front
   façade (left to right seen from the street), y from the front façade to the back. Walls are generated from the room
   outlines, so a plan is a list of rooms per floor plus the doors and windows; edges must be horizontal or vertical. */

export type RoomKind =
  | "living"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "entrance"
  | "hall"
  | "storage"
  | "balcony"
  | "terrace"
  | "garden"
  | "lobby"
  | "landing"
  | "stairs"
  | "lift"
  | "shaft"
  | "plant";

export type Point = [number, number];

export interface PlanRoom {
  id: string;
  kind: RoomKind;
  /** Overrides the default name of the kind. */
  name?: L10n;
  poly: Point[];
}

export interface PlanOpening {
  kind: "door" | "window" | "french" | "opening";
  /** Centre of the opening, on a wall line. */
  at: Point;
  width: number;
}

export interface PlanFloor {
  id: string;
  level: number;
  name: L10n;
  /** Slug of the project (phase) the floor belongs to. */
  project?: string;
  /** Rooms of each apartment (unitId matches Unit.id), outdoor spaces included. */
  units: { unitId: string; rooms: PlanRoom[] }[];
  /** Stairs, lift, landing, plant areas. */
  common: PlanRoom[];
  openings: PlanOpening[];
  /** A roof: parapets instead of walls. */
  roof?: boolean;
  /** Boxes on the floor (heat pumps, lift overrun): x, y, width, depth, height. */
  equipment?: { kind: "heatpump" | "housing"; box: [number, number, number, number, number] }[];
}

export interface BuildingPlan {
  id: string;
  name: string;
  /** True when the plan is drawn for the demo and not taken from the project's drawings. */
  illustrative: boolean;
  footprint: Point[];
  /** Floor-to-floor height and slab thickness. */
  storey: number;
  slab: number;
  street?: string;
  floors: PlanFloor[];
}
