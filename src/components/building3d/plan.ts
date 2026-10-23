import type { BuildingPlan, L10n, PlanFloor, PlanOpening, PlanRoom, Point, RoomKind } from "@/lib/types";

/* From a floor plan (rooms, doors, windows) to what the 3D view draws: walls with their thickness and openings,
   slabs, railings, the drafting symbols (door swings, window panes, stair flights, lift cross) and each apartment's
   outline. Pure geometry in plan coordinates: x along the front, y towards the back, h above the floor's top. */

export type RoomGroup = "day" | "night" | "bath" | "serv" | "dist" | "out" | "plant";
export const GROUPS: RoomGroup[] = ["day", "night", "bath", "serv", "dist", "out", "plant"];

export const GROUP_OF: Record<RoomKind, RoomGroup> = {
  living: "day",
  kitchen: "day",
  bedroom: "night",
  bathroom: "bath",
  entrance: "dist",
  hall: "dist",
  storage: "serv",
  balcony: "out",
  terrace: "out",
  garden: "out",
  lobby: "dist",
  landing: "dist",
  stairs: "dist",
  lift: "dist",
  shaft: "plant",
  plant: "plant",
};

const OUTDOOR = new Set<RoomKind>(["balcony", "terrace", "garden"]);

const T = { exterior: 0.3, party: 0.22, partition: 0.1 };
const PARAPET = 1.1;
const RAIL = 1;
const DOOR_HEAD = 2.1;
const SILL = 0.9;
const HEAD = 2.2;
const EPS = 1e-3;

/** A box standing on the floor: plan extent and height range above the floor's top. */
export interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  h0: number;
  h1: number;
}

/** A line segment: x, h, y of each end. */
export type Seg = [number, number, number, number, number, number];

export interface Room {
  id: string;
  kind: RoomKind;
  group: RoomGroup;
  unitId: string | null;
  name?: L10n;
  poly: Point[];
  area: number;
  anchor: Point;
  outdoor: boolean;
}

export interface UnitShape {
  unitId: string;
  rooms: string[];
  /** Indoor area from the plan, m². */
  area: number;
  /** Outline of the apartment (and its outdoor spaces) on the floor. */
  outline: Seg[];
  /** Where its tag floats: the middle of its indoor rooms. */
  anchor: Point;
  bounds: [number, number, number, number];
}

export interface Floor {
  id: string;
  level: number;
  name: L10n;
  project?: string;
  roof: boolean;
  rooms: Room[];
  units: UnitShape[];
  walls: Box[];
  slabs: { poly: Point[]; thick: number }[];
  equipment: Box[];
  /** Door swings, window panes, stairs, lift cross. */
  details: Seg[];
  railings: Seg[];
  bounds: [number, number, number, number];
}

export interface Building {
  plan: BuildingPlan;
  /** Footprint extent. */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  wallHeight: number;
  floors: Floor[];
}

/* ---------------------------------------------------------------- polygons */

export function area(poly: Point[]): number {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

export function inside([x, y]: Point, poly: Point[]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

function bbox(polys: Point[][]): [number, number, number, number] {
  const xs = polys.flat().map((p) => p[0]);
  const ys = polys.flat().map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

/** A point well inside the polygon for its label: the centroid, or for an L-shape the inner point farthest from the edges. */
function labelPoint(poly: Point[]): Point {
  const c: Point = [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  if (inside(c, poly) && edgeDistance(c, poly) > 0.6) return c;
  const [x0, y0, x1, y1] = bbox([poly]);
  let best = c;
  let bestD = -1;
  for (let x = x0 + 0.1; x < x1; x += 0.2)
    for (let y = y0 + 0.1; y < y1; y += 0.2) {
      if (!inside([x, y], poly)) continue;
      const d = edgeDistance([x, y], poly);
      if (d > bestD) {
        bestD = d;
        best = [x, y];
      }
    }
  return best;
}

function edgeDistance([x, y]: Point, poly: Point[]): number {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    d = Math.min(d, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return d;
}

/* ---------------------------------------------------------------- lines */

/** An edge on a horizontal (y = c) or vertical (x = c) line, from s0 to s1 along it. */
interface Edge {
  horiz: boolean;
  c: number;
  s0: number;
  s1: number;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function edgesOf(poly: Point[]): Edge[] {
  const out: Edge[] = [];
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    if (Math.abs(ay - by) < EPS) out.push({ horiz: true, c: r3(ay), s0: Math.min(ax, bx), s1: Math.max(ax, bx) });
    else if (Math.abs(ax - bx) < EPS) out.push({ horiz: false, c: r3(ax), s0: Math.min(ay, by), s1: Math.max(ay, by) });
    // Sloping edges are not supported yet: they get no wall.
  }
  return out;
}

/** Splits every line into the pieces between all edge ends, and tells how many edges cover each piece. */
function pieces(edges: Edge[]) {
  const lines = new Map<string, Edge[]>();
  for (const e of edges) {
    const key = `${e.horiz ? "h" : "v"}${e.c}`;
    if (!lines.has(key)) lines.set(key, []);
    lines.get(key)!.push(e);
  }
  const out: { horiz: boolean; c: number; a: number; b: number; count: number }[] = [];
  for (const list of lines.values()) {
    const cuts = [...new Set(list.flatMap((e) => [r3(e.s0), r3(e.s1)]))].sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const [a, b] = [cuts[i], cuts[i + 1]];
      if (b - a < EPS) continue;
      const count = list.filter((e) => e.s0 <= a + EPS && e.s1 >= b - EPS).length;
      if (count) out.push({ horiz: list[0].horiz, c: list[0].c, a, b, count });
    }
  }
  return out;
}

const at = (horiz: boolean, c: number, s: number, off = 0): Point => (horiz ? [s, c + off] : [c + off, s]);

const seg = (p: Point, hp: number, q: Point, hq: number): Seg => [p[0], hp, p[1], q[0], hq, q[1]];

/* ---------------------------------------------------------------- floors */

type Zone = { unit: string; room: Room | null; outside: boolean };

function prepareFloor(f: PlanFloor, plan: BuildingPlan, wallHeight: number): Floor {
  const rooms: Room[] = [
    ...f.units.flatMap((u) => u.rooms.map((r) => room(r, u.unitId))),
    ...f.common.map((r) => room(r, null, f.id)),
  ];
  const indoor = rooms.filter((r) => !r.outdoor);

  const zone = (p: Point): Zone => {
    const r = rooms.find((x) => inside(p, x.poly));
    if (r && !r.outdoor) return { unit: r.unitId ?? "common", room: r, outside: false };
    if (!inside(p, plan.footprint)) return { unit: "outside", room: r ?? null, outside: true };
    return { unit: r?.unitId ?? "common", room: r ?? null, outside: f.roof ?? false };
  };

  const walls: Box[] = [];
  const details: Seg[] = [];
  const box = (horiz: boolean, c: number, a: number, b: number, t: number, h0: number, h1: number) => {
    if (b - a < EPS || h1 - h0 < EPS) return;
    walls.push(horiz ? { x0: a, x1: b, y0: c - t / 2, y1: c + t / 2, h0, h1 } : { x0: c - t / 2, x1: c + t / 2, y0: a, y1: b, h0, h1 });
  };

  if (f.roof) {
    // Parapets on the edge of the roof.
    for (const e of edgesOf(plan.footprint)) box(e.horiz, e.c, e.s0 - T.exterior / 2, e.s1 + T.exterior / 2, T.exterior, 0, PARAPET);
  } else {
    // Each piece of every room edge becomes a wall; its thickness depends on what it separates.
    const raw = pieces([...indoor.flatMap((r) => edgesOf(r.poly)), ...edgesOf(plan.footprint)]);
    type Run = { horiz: boolean; c: number; a: number; b: number; kind: keyof typeof T };
    const runs: Run[] = [];
    for (const p of raw) {
      const mid = (p.a + p.b) / 2;
      const z1 = zone(at(p.horiz, p.c, mid, -0.06));
      const z2 = zone(at(p.horiz, p.c, mid, 0.06));
      if (z1.outside && z2.outside) continue;
      if (!z1.outside && !z2.outside && z1.room && z1.room === z2.room) continue;
      const kind: Run["kind"] = z1.outside || z2.outside ? "exterior" : z1.unit !== z2.unit ? "party" : "partition";
      const last = runs[runs.length - 1];
      if (last && last.horiz === p.horiz && last.c === p.c && last.kind === kind && Math.abs(last.b - p.a) < EPS) last.b = p.b;
      else runs.push({ horiz: p.horiz, c: p.c, a: p.a, b: p.b, kind });
    }

    for (const run of runs) {
      const t = T[run.kind];
      const ext = run.kind === "exterior" ? t / 2 : 0;
      const holes = f.openings
        .filter((o) => (run.horiz ? Math.abs(o.at[1] - run.c) < 0.05 : Math.abs(o.at[0] - run.c) < 0.05))
        .map((o) => {
          const s = run.horiz ? o.at[0] : o.at[1];
          return { o, a: Math.max(run.a, s - o.width / 2), b: Math.min(run.b, s + o.width / 2) };
        })
        .filter((h) => h.b - h.a > EPS)
        .sort((p, q) => p.a - q.a);
      let from = run.a - ext;
      for (const h of holes) {
        box(run.horiz, run.c, from, h.a, t, 0, wallHeight);
        from = h.b;
        const k = h.o.kind;
        if (k === "door") box(run.horiz, run.c, h.a, h.b, t, DOOR_HEAD, wallHeight);
        if (k === "window") {
          box(run.horiz, run.c, h.a, h.b, t, 0, SILL);
          box(run.horiz, run.c, h.a, h.b, t, HEAD, wallHeight);
        }
        if (k === "french") box(run.horiz, run.c, h.a, h.b, t, HEAD, wallHeight);
        details.push(...openingSymbol(h.o, run.horiz, run.c, h.a, h.b, t, zone, wallHeight));
      }
      box(run.horiz, run.c, from, run.b + ext, t, 0, wallHeight);
    }

    for (const r of rooms) {
      if (r.kind === "stairs") details.push(...stairs(r.poly, plan.storey));
      if (r.kind === "lift") {
        const [x0, y0, x1, y1] = bbox([r.poly]);
        details.push(seg([x0 + 0.15, y0 + 0.15], 0.02, [x1 - 0.15, y1 - 0.15], 0.02), seg([x0 + 0.15, y1 - 0.15], 0.02, [x1 - 0.15, y0 + 0.15], 0.02));
      }
    }
  }

  const slabs = [{ poly: plan.footprint, thick: plan.slab }];
  const railings: Seg[] = [];
  for (const r of rooms.filter((x) => x.outdoor)) {
    if (r.kind === "balcony") slabs.push({ poly: r.poly, thick: 0.18 });
    for (let i = 0; i < r.poly.length; i++) {
      const p = r.poly[i];
      const q = r.poly[(i + 1) % r.poly.length];
      const m: Point = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      // No railing against the building, or along the roof's own parapet.
      if (edgeDistance(m, plan.footprint) < 0.5) continue;
      if (r.kind === "garden") {
        railings.push(seg(p, 0.02, q, 0.02));
        continue;
      }
      railings.push(seg(p, RAIL, q, RAIL), seg(p, 0.05, q, 0.05));
      const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const n = Math.max(1, Math.round(len / 1.2));
      for (let k = 0; k <= n; k++) {
        const s: Point = [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n];
        railings.push(seg(s, 0.05, s, RAIL));
      }
    }
  }

  const equipment: Box[] = (f.equipment ?? []).map(({ box: [x, y, w, d, h] }) => ({ x0: x, x1: x + w, y0: y, y1: y + d, h0: 0, h1: h }));

  const units: UnitShape[] = f.units.map((u) => {
    const own = rooms.filter((r) => r.unitId === u.unitId);
    const inner = own.filter((r) => !r.outdoor);
    const b = bbox((inner.length ? inner : own).map((r) => r.poly));
    const outline = pieces(own.flatMap((r) => edgesOf(r.poly)))
      .filter((p) => p.count === 1)
      .map((p) => seg(at(p.horiz, p.c, p.a), 0.04, at(p.horiz, p.c, p.b), 0.04));
    return {
      unitId: u.unitId,
      rooms: own.map((r) => r.id),
      area: inner.reduce((s, r) => s + r.area, 0),
      outline,
      anchor: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2],
      bounds: b,
    };
  });

  return {
    id: f.id,
    level: f.level,
    name: f.name,
    project: f.project,
    roof: f.roof ?? false,
    rooms,
    units,
    walls,
    slabs,
    equipment,
    details,
    railings,
    bounds: bbox([plan.footprint, ...rooms.map((r) => r.poly)]),
  };
}

/** A room: an apartment's keeps its id, a common one (the same stairs on every floor) gets its floor's. */
function room(r: PlanRoom, unitId: string | null, floorId?: string): Room {
  return {
    id: unitId ? r.id : `common-${floorId}-${r.id}`,
    kind: r.kind,
    group: GROUP_OF[r.kind],
    unitId,
    name: r.name,
    poly: r.poly,
    area: area(r.poly),
    anchor: labelPoint(r.poly),
    outdoor: OUTDOOR.has(r.kind),
  };
}

/** Drafting symbol of an opening: a door's leaf and swing, a sliding door, or a window's pane. */
function openingSymbol(o: PlanOpening, horiz: boolean, c: number, a: number, b: number, t: number, zone: (p: Point) => Zone, wallHeight: number): Seg[] {
  const out: Seg[] = [];
  const w = b - a;
  if (o.kind === "window" || o.kind === "french") {
    const h0 = o.kind === "window" ? SILL : 0.02;
    const pts = [a, b, ...(w > 1.3 ? [(a + b) / 2] : [])];
    out.push(seg(at(horiz, c, a), h0, at(horiz, c, b), h0), seg(at(horiz, c, a), HEAD, at(horiz, c, b), HEAD));
    for (const s of pts) out.push(seg(at(horiz, c, s), h0, at(horiz, c, s), HEAD));
    return out;
  }
  if (o.kind !== "door") return out;
  const mid = (a + b) / 2;
  const z1 = zone(at(horiz, c, mid, -0.3));
  const z2 = zone(at(horiz, c, mid, 0.3));
  if (z1.room?.kind === "lift" || z2.room?.kind === "lift") {
    // Lift doors slide: two leaves in the wall.
    out.push(seg(at(horiz, c, a), 0.02, at(horiz, c, b), 0.02), seg(at(horiz, c, a), DOOR_HEAD, at(horiz, c, b), DOOR_HEAD));
    return out;
  }
  // The door opens into the flat from the landing, into the smaller room inside a flat, and inwards from the street.
  const score = (z: Zone) => (z.outside ? 1e6 : z.unit === "common" && z.room?.kind !== "lobby" ? 1e5 : (z.room?.area ?? 1e4));
  const side = score(z1) < score(z2) ? -1 : 1;
  const face = c + side * (t / 2);
  const hinge = at(horiz, face, a);
  const open = at(horiz, face + side * w, a);
  out.push(seg(hinge, 0.02, open, 0.02), seg(hinge, 0.02, hinge, Math.min(DOOR_HEAD, wallHeight)));
  const n = 12;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * (Math.PI / 2);
    const t1 = ((i + 1) / n) * (Math.PI / 2);
    const p = (k: number): Point => at(horiz, face + side * w * Math.sin(k), a + w * Math.cos(k));
    out.push(seg(p(t0), 0.02, p(t1), 0.02));
  }
  return out;
}

/** Two flights and a half landing, climbing one storey; drawn as nosings and side profiles. */
function stairs(poly: Point[], storey: number): Seg[] {
  const [x0, y0, x1, y1] = bbox([poly]);
  const out: Seg[] = [];
  const n = 9;
  const rise = storey / (2 * n);
  const xm = (x0 + x1) / 2;
  const land = Math.min(1.1, (y1 - y0) * 0.3);
  const run = (y1 - land - y0 - 0.05) / n;
  const flight = (xa: number, xb: number, up: boolean) => {
    for (let i = 1; i <= n; i++) {
      const y = up ? y0 + 0.05 + (i - 1) * run : y1 - land - (i - 1) * run;
      const yNext = up ? y + run : y - run;
      const h = (up ? 0 : storey / 2) + i * rise;
      const hPrev = h - rise;
      out.push(seg([xa, y], h, [xb, y], h));
      for (const x of [xa, xb]) out.push(seg([x, y], hPrev, [x, y], h), seg([x, y], h, [x, yNext], h));
    }
  };
  flight(x0 + 0.08, xm - 0.04, true);
  flight(xm + 0.04, x1 - 0.08, false);
  const hl = storey / 2;
  out.push(
    seg([x0 + 0.08, y1 - land], hl, [x1 - 0.08, y1 - land], hl),
    seg([x0 + 0.08, y1 - 0.08], hl, [x1 - 0.08, y1 - 0.08], hl),
    seg([x0 + 0.08, y1 - land], hl, [x0 + 0.08, y1 - 0.08], hl),
    seg([x1 - 0.08, y1 - land], hl, [x1 - 0.08, y1 - 0.08], hl),
  );
  return out;
}

export function prepareBuilding(plan: BuildingPlan): Building {
  const [x0, y0, x1, y1] = bbox([plan.footprint]);
  const wallHeight = plan.storey - plan.slab;
  return { plan, x0, x1, y0, y1, wallHeight, floors: [...plan.floors].sort((a, b) => a.level - b.level).map((f) => prepareFloor(f, plan, wallHeight)) };
}

/* ---------------------------------------------------------------- façades */

export interface Facade {
  a: Point;
  b: Point;
  /** Outward unit normal, in plan coordinates. */
  normal: [number, number];
}

/** The outside walls: the footprint's edges, each with the way it faces. */
export function facades(plan: BuildingPlan): Facade[] {
  const fp = plan.footprint;
  return fp.map((a, i) => {
    const b = fp[(i + 1) % fp.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    let normal: [number, number] = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
    const mid: Point = [(a[0] + b[0]) / 2 + normal[0] * 0.1, (a[1] + b[1]) / 2 + normal[1] * 0.1];
    if (inside(mid, fp)) normal = [-normal[0], -normal[1]];
    return { a, b, normal };
  });
}

/** The façades an apartment has windows or French windows on, on any of its floors. */
export function unitFacades(plan: BuildingPlan, unitId: string): Facade[] {
  const all = facades(plan);
  const found = new Set<Facade>();
  for (const f of plan.floors) {
    const rooms = f.units.find((u) => u.unitId === unitId)?.rooms.filter((r) => !OUTDOOR.has(r.kind)) ?? [];
    if (!rooms.length) continue;
    for (const o of f.openings) {
      if (o.kind !== "window" && o.kind !== "french") continue;
      if (!rooms.some((r) => edgeDistance(o.at, r.poly) < 0.25)) continue;
      const on = all.find((fc) => edgeDistance(o.at, [fc.a, fc.b]) < 0.25);
      if (on) found.add(on);
    }
  }
  return all.filter((fc) => found.has(fc));
}
