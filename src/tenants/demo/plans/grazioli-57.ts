import type { BuildingPlan, PlanFloor, PlanOpening, PlanRoom, Point } from "@/lib/types";

/* Grazioli 57, an ILLUSTRATIVE plan drawn for the demo: the real drawings are not public. It agrees with the public
   facts (15 apartments, one- and two-bedroom, 50–100 m², a lift) and with the units listed in ../index.ts.

   A 22 × 11 m block with the stair core in the middle. On every floor: a two-bedroom flat on the left (x 0–9, 99 m²),
   and two one-bedroom flats on the right, one on the street (x 12.5–22, y 0–5.5) and one at the back (y 5.5–11), 52 m²
   each. Gardens on the ground floor, balconies above, the top-floor terraces and the heat pumps on the roof. */

const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];

const name = (it: string, en: string) => ({ it, en });

const MAIN_BEDROOM = name("Camera matrimoniale", "Main bedroom");

/** Two-bedroom flat on the left. */
function left(unit: string): PlanRoom[] {
  return [
    {
      id: `${unit}-living`,
      kind: "living",
      name: name("Soggiorno con cucina", "Living room and kitchen"),
      poly: [
        [0, 0],
        [6, 0],
        [6, 5.4],
        [3.2, 5.4],
        [3.2, 6.6],
        [0, 6.6],
      ],
    },
    { id: `${unit}-bed2`, kind: "bedroom", name: name("Camera singola", "Single bedroom"), poly: rect(6, 0, 9, 3.6) },
    {
      id: `${unit}-hall`,
      kind: "hall",
      poly: [
        [6, 3.6],
        [9, 3.6],
        [9, 5.6],
        [7.7, 5.6],
        [7.7, 6.6],
        [3.2, 6.6],
        [3.2, 5.4],
        [6, 5.4],
      ],
    },
    { id: `${unit}-store`, kind: "storage", poly: rect(7.7, 5.6, 9, 6.6) },
    { id: `${unit}-bed1`, kind: "bedroom", name: MAIN_BEDROOM, poly: rect(0, 6.6, 4.4, 11) },
    { id: `${unit}-bath1`, kind: "bathroom", poly: rect(4.4, 6.6, 6.6, 11) },
    { id: `${unit}-bath2`, kind: "bathroom", name: name("Bagno e lavanderia", "Bathroom and laundry"), poly: rect(6.6, 6.6, 9, 11) },
  ];
}

const SMALL_LIVING = name("Soggiorno con angolo cottura", "Living room with kitchenette");

/** One-bedroom flat on the street side. */
function front(unit: string): PlanRoom[] {
  return [
    { id: `${unit}-living`, kind: "living", name: SMALL_LIVING, poly: rect(12.5, 0, 17.8, 5.5) },
    { id: `${unit}-bed`, kind: "bedroom", name: MAIN_BEDROOM, poly: rect(17.8, 0, 22, 3.9) },
    { id: `${unit}-bath`, kind: "bathroom", poly: rect(17.8, 3.9, 22, 5.5) },
  ];
}

/** One-bedroom flat at the back. */
function back(unit: string): PlanRoom[] {
  return [
    { id: `${unit}-living`, kind: "living", name: SMALL_LIVING, poly: rect(12.5, 5.5, 17.8, 11) },
    { id: `${unit}-bath`, kind: "bathroom", poly: rect(17.8, 5.5, 22, 7.1) },
    { id: `${unit}-bed`, kind: "bedroom", name: MAIN_BEDROOM, poly: rect(17.8, 7.1, 22, 11) },
  ];
}

const outdoor = (unit: string, kind: "balcony" | "terrace" | "garden", poly: Point[]): PlanRoom => ({ id: `${unit}-${kind}`, kind, poly });

const door = (x: number, y: number, width = 0.8): PlanOpening => ({ kind: "door", at: [x, y], width });
const win = (x: number, y: number, width: number): PlanOpening => ({ kind: "window", at: [x, y], width });
const french = (x: number, y: number, width: number): PlanOpening => ({ kind: "french", at: [x, y], width });

function core(ground: boolean): PlanRoom[] {
  return [
    { id: "lift", kind: "lift", poly: rect(9, 0, 10.8, 2.6) },
    ground ? { id: "lobby", kind: "lobby", poly: rect(10.8, 0, 12.5, 2.6) } : { id: "shaft", kind: "shaft", poly: rect(10.8, 0, 12.5, 2.6) },
    { id: "landing", kind: "landing", poly: rect(9, 2.6, 12.5, 7) },
    { id: "stairs", kind: "stairs", poly: rect(9, 7, 12.5, 11) },
  ];
}

/** Doors and windows of a typical floor. `out` says which flats open onto a balcony or garden, and on which side. */
function openings(ground: boolean, out: { left?: "front" | "back"; front?: boolean; back?: boolean }): PlanOpening[] {
  return [
    // core
    { kind: "opening", at: [10.75, 7], width: 3.5 },
    door(9.9, 2.6),
    win(10.75, 11, 1.2),
    ...(ground ? [door(11.65, 0, 1.2), { kind: "opening" as const, at: [11.65, 2.6] as Point, width: 1.4 }] : []),
    // two-bedroom flat
    door(9, 4.6, 0.9),
    door(6, 4.5, 0.9),
    door(7, 3.6),
    door(3.8, 6.6),
    door(5.5, 6.6),
    door(7.15, 6.6, 0.7),
    door(7.7, 6.1, 0.7),
    win(1.3, 0, 1.2),
    out.left === "front" ? french(4.4, 0, 1.4) : win(4.4, 0, 1.4),
    win(0, 3, 1.2),
    win(7.5, 0, 1.2),
    out.left === "back" ? french(2.2, 11, 1.2) : win(2.2, 11, 1.4),
    win(0, 8.8, 1),
    win(5.5, 11, 0.7),
    win(7.8, 11, 0.7),
    // one-bedroom flat, street side
    door(12.5, 4.6, 0.9),
    door(17.8, 3.2),
    door(17.8, 4.7, 0.7),
    out.front ? french(15.2, 0, 1.6) : win(15.2, 0, 1.6),
    win(19.9, 0, 1.2),
    win(22, 1.95, 1),
    win(22, 4.7, 0.6),
    // one-bedroom flat, back
    door(12.5, 6.4, 0.9),
    door(17.8, 6.3, 0.7),
    door(17.8, 7.8),
    out.back ? french(15.2, 11, 1.6) : win(15.2, 11, 1.6),
    win(19.9, 11, 1.2),
    win(22, 9.05, 1),
    win(22, 6.3, 0.6),
  ];
}

const BALCONY_LEFT = rect(0.6, -1.6, 6.6, 0);
const BALCONY_FRONT = rect(13, -1.4, 17.5, 0);
const BALCONY_BACK = rect(13, 11, 17.5, 12.4);

const FASE_1 = "grazioli-57-fase-1";
const FASE_2 = "grazioli-57-fase-2";

const floors: PlanFloor[] = [
  {
    id: "pt",
    level: 0,
    name: name("Piano terra", "Ground floor"),
    project: FASE_2,
    units: [
      { unitId: "A2", rooms: [...left("A2"), outdoor("A2", "garden", rect(0, 11, 9, 17.5))] },
      { unitId: "A1", rooms: front("A1") },
      { unitId: "A3", rooms: [...back("A3"), outdoor("A3", "garden", rect(12.5, 11, 22, 14.7))] },
    ],
    common: core(true),
    openings: openings(true, { left: "back", back: true }),
  },
  {
    id: "p1",
    level: 1,
    name: name("Primo piano", "First floor"),
    project: FASE_2,
    units: [
      { unitId: "B1", rooms: [...left("B1"), outdoor("B1", "balcony", BALCONY_LEFT)] },
      { unitId: "B2", rooms: [...front("B2"), outdoor("B2", "balcony", BALCONY_FRONT)] },
      { unitId: "B3", rooms: [...back("B3"), outdoor("B3", "balcony", BALCONY_BACK)] },
    ],
    common: core(false),
    openings: openings(false, { left: "front", front: true, back: true }),
  },
  {
    id: "p2",
    level: 2,
    name: name("Secondo piano", "Second floor"),
    project: FASE_1,
    units: [
      { unitId: "C2", rooms: [...left("C2"), outdoor("C2", "balcony", BALCONY_LEFT)] },
      { unitId: "C1", rooms: [...front("C1"), outdoor("C1", "balcony", BALCONY_FRONT)] },
      { unitId: "C3", rooms: back("C3") },
    ],
    common: core(false),
    openings: openings(false, { left: "front", front: true }),
  },
  {
    id: "p3",
    level: 3,
    name: name("Terzo piano", "Third floor"),
    project: FASE_1,
    units: [
      { unitId: "D2", rooms: [...left("D2"), outdoor("D2", "balcony", BALCONY_LEFT)] },
      { unitId: "D1", rooms: [...front("D1"), outdoor("D1", "balcony", BALCONY_FRONT)] },
      { unitId: "D3", rooms: back("D3") },
    ],
    common: core(false),
    openings: openings(false, { left: "front", front: true }),
  },
  {
    id: "p4",
    level: 4,
    name: name("Quarto piano", "Fourth floor"),
    project: FASE_1,
    units: [
      { unitId: "E2", rooms: left("E2") },
      { unitId: "E1", rooms: front("E1") },
      { unitId: "E3", rooms: [...back("E3"), outdoor("E3", "balcony", BALCONY_BACK)] },
    ],
    common: core(false),
    openings: openings(false, { back: true }),
  },
  {
    id: "roof",
    level: 5,
    name: name("Copertura", "Roof"),
    project: FASE_1,
    roof: true,
    units: [
      { unitId: "E2", rooms: [outdoor("E2", "terrace", rect(0.4, 0.4, 8.4, 5.4))] },
      { unitId: "E1", rooms: [outdoor("E1", "terrace", rect(12.9, 0.4, 21.6, 6.1))] },
    ],
    common: [{ id: "plant", kind: "plant", name: name("Pompe di calore", "Heat pumps"), poly: rect(12.9, 6.5, 21.6, 10.6) }],
    openings: [],
    equipment: [
      { kind: "housing", box: [9, 7, 3.5, 4, 2.6] },
      { kind: "housing", box: [9, 0, 1.8, 2.6, 1.4] },
      // one heat pump per apartment
      ...[13.4, 15, 16.6, 18.2, 19.8].flatMap((x) =>
        [6.9, 8.1, 9.3].map((y) => ({ kind: "heatpump" as const, box: [x, y, 1, 0.4, 0.8] as [number, number, number, number, number] })),
      ),
    ],
  },
];

export const grazioli57: BuildingPlan = {
  id: "grazioli-57",
  name: "Grazioli 57",
  illustrative: true,
  footprint: rect(0, 0, 22, 11),
  storey: 3,
  slab: 0.3,
  street: "Via Don Bartolomeo Grazioli",
  // The street runs east-north-east here; the front is drawn facing it, to the north (illustrative, like the plan).
  facing: 352,
  floors,
};
