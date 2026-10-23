#!/usr/bin/env node
/* Draws the neighbourhood of a project from OpenStreetMap and finds the services around it, with walking times.

   node scripts/build-map.mjs --center 45.50853,9.17022 --radius 1100 --id grazioli-57 \
     --json src/tenants/demo/maps/grazioli-57.json [--label "Via Don B. Grazioli"] [--cache dir]

   Writes public/media/maps/<id>.svg (the drawing, loaded by the page as an image) and the JSON (its frame, the
   project's position and the services). Walking times follow the street and footpath network (shortest path), at
   4.8 km/h. The area is downloaded from the OSM API in four tiles; --cache keeps them for later runs.
   Map data © OpenStreetMap contributors, ODbL: the page shows the attribution. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
if (!args.center || !args.id || !args.json) {
  console.error("usage: build-map.mjs --center lat,lng --id name --json out.json [--radius m] [--label text] [--cache dir]");
  process.exit(1);
}
const root = join(dirname(new URL(import.meta.url).pathname), "..");
const [pinLat, pinLng] = args.center.split(",").map(Number);
const radius = Number(args.radius ?? 1100);
const dLat = radius / 111320;
const dLon = radius / (111320 * Math.cos((pinLat * Math.PI) / 180));
const [minLat, maxLat, minLon, maxLon] = [pinLat - dLat, pinLat + dLat, pinLng - dLon, pinLng + dLon];

/* ---------------------------------------------------------------- download */

async function tile(b) {
  const key = b.map((n) => n.toFixed(5)).join(",");
  const file = args.cache ? join(args.cache, `osm-${key}.xml`) : null;
  if (file && existsSync(file)) return readFileSync(file, "utf8");
  const res = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${key}`, { headers: { "User-Agent": "cantiere-live map builder" } });
  if (!res.ok) throw new Error(`OSM API ${res.status} for ${key}`);
  const xml = await res.text();
  if (file) {
    mkdirSync(args.cache, { recursive: true });
    writeFileSync(file, xml);
  }
  return xml;
}

const midLat = (minLat + maxLat) / 2;
const midLon = (minLon + maxLon) / 2;
const tiles = await Promise.all(
  [
    [minLon, minLat, midLon, midLat],
    [midLon, minLat, maxLon, midLat],
    [minLon, midLat, midLon, maxLat],
    [midLon, midLat, maxLon, maxLat],
  ].map(tile),
);

const tagsOf = (body) => Object.fromEntries([...(body ?? "").matchAll(/<tag k="([^"]*)" v="([^"]*)"\/>/g)].map((m) => [m[1], decode(m[2])]));
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

const nodes = new Map();
const nodeTags = new Map();
const ways = new Map();
for (const xml of tiles) {
  for (const m of xml.matchAll(/<node id="(\d+)"[^>]*?lat="([-\d.]+)" lon="([-\d.]+)"[^>]*?(?:\/>|>([\s\S]*?)<\/node>)/g)) {
    nodes.set(m[1], [Number(m[2]), Number(m[3])]);
    if (m[4]) nodeTags.set(m[1], tagsOf(m[4]));
  }
  for (const m of xml.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
    if (!ways.has(m[1])) ways.set(m[1], { refs: [...m[2].matchAll(/<nd ref="(\d+)"\/>/g)].map((n) => n[1]), tags: tagsOf(m[2]) });
  }
}

/* ---------------------------------------------------------------- drawing */

const W = 1000;
const k = Math.cos((pinLat * Math.PI) / 180);
const H = Math.round((W * (maxLat - minLat)) / ((maxLon - minLon) * k));
const px = (lat, lon) => [((lon - minLon) / (maxLon - minLon)) * W, ((maxLat - lat) / (maxLat - minLat)) * H];
const r1 = (n) => Math.round(n * 10) / 10;

// Compact path data: the first point absolute, the rest relative, at 0.1 px, without the points a straight line
// already passes through (Douglas–Peucker, 0.35 px).
const num = (n) => {
  const s = String(Math.round(n * 10) / 10);
  return s.replace(/^(-?)0\./, "$1.");
};
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a];
    const [bx, by] = pts[b];
    const len = Math.hypot(bx - ax, by - ay);
    let far = -1;
    let fd = tol;
    for (let i = a + 1; i < b; i++) {
      // A closed ring starts and ends on the same point: there, the distance is from that point.
      const d = len < 1e-6 ? Math.hypot(pts[i][0] - ax, pts[i][1] - ay) : Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / len;
      if (d > fd) [far, fd] = [i, d];
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
function pathOf(points, closed) {
  const pts = simplify(points, 0.35).map(([x, y]) => [Math.round(x * 10), Math.round(y * 10)]);
  let d = `M${num(pts[0][0] / 10)} ${num(pts[0][1] / 10)}l`;
  let first = true;
  for (let i = 1; i < pts.length - (closed ? 1 : 0); i++) {
    const dx = (pts[i][0] - pts[i - 1][0]) / 10;
    const dy = (pts[i][1] - pts[i - 1][1]) / 10;
    if (!dx && !dy) continue;
    for (const v of [dx, dy]) {
      const t = num(v);
      d += first || t.startsWith("-") ? t : ` ${t}`;
      first = false;
    }
  }
  return d + (closed ? "z" : "");
}

const layers = { buildings: [], parks: [], water: [], rail: [], tram: [], major: [], minor: [], paths: [] };
const parkLabels = [];
const streets = [];
for (const { refs, tags: t } of ways.values()) {
  const pts = refs.map((id) => nodes.get(id)).filter(Boolean);
  if (pts.length < 2) continue;
  const closed = refs[0] === refs[refs.length - 1];
  let layer = null;
  if (t.building && closed) layer = "buildings";
  else if (closed && (["park", "garden", "playground"].includes(t.leisure) || ["grass", "recreation_ground", "village_green", "forest", "meadow"].includes(t.landuse))) layer = "parks";
  else if (t.natural === "water" || t.waterway === "canal") layer = "water";
  else if (t.railway === "rail" || t.railway === "light_rail") layer = "rail";
  else if (t.railway === "tram") layer = "tram";
  else if (["trunk", "primary", "secondary", "tertiary"].includes(t.highway)) layer = "major";
  else if (["residential", "unclassified", "living_street", "service"].includes(t.highway)) layer = "minor";
  else if (["pedestrian", "cycleway"].includes(t.highway)) layer = "paths";
  if (!layer) continue;
  layers[layer].push(pathOf(pts.map(([lat, lon]) => px(lat, lon)), closed));
  if (layer === "parks" && t.name && t.leisure === "park" && pts.length > 20 && /^(Parco|Giardino)\b/.test(t.name)) {
    const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
    parkLabels.push({ text: t.name, at: px(c[0], c[1]) });
  }
  if ((layer === "major" || layer === "minor") && t.name) streets.push({ name: t.name, pts });
}

const [pinX, pinY] = px(pinLat, pinLng);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const inside = ([x, y]) => x > 20 && x < W - 20 && y > 20 && y < H - 20;

// The project's street, named along its segment closest to the pin.
let street = null;
for (const { name, pts } of streets)
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = px(...pts[i]);
    const [bx, by] = px(...pts[i + 1]);
    const d = Math.hypot((ax + bx) / 2 - pinX, (ay + by) / 2 - pinY);
    if (!street || d < street.d) street = { name, d, ax, ay, bx, by };
  }

/* ---------------------------------------------------------------- walking network */

const WALK = new Set(["footway", "path", "pedestrian", "living_street", "residential", "service", "unclassified", "tertiary", "secondary", "primary", "trunk", "steps", "cycleway", "track", "crossing", "corridor", "tertiary_link", "secondary_link", "primary_link"]);
const metres = ([a, b], [c, d]) => {
  const x = ((d - b) * Math.PI) / 180 * Math.cos(((a + c) / 2) * (Math.PI / 180));
  const y = ((c - a) * Math.PI) / 180;
  return Math.hypot(x, y) * 6371000;
};
const graph = new Map();
const link = (a, b, w) => {
  if (!graph.has(a)) graph.set(a, []);
  graph.get(a).push([b, w]);
};
for (const { refs, tags: t } of ways.values()) {
  if (!WALK.has(t.highway) || t.foot === "no" || t.access === "private" || t.access === "no") continue;
  for (let i = 0; i < refs.length - 1; i++) {
    const p = nodes.get(refs[i]);
    const q = nodes.get(refs[i + 1]);
    if (!p || !q) continue;
    const w = metres(p, q);
    link(refs[i], refs[i + 1], w);
    link(refs[i + 1], refs[i], w);
  }
}
const graphNodes = [...graph.keys()];
const nearest = (pt) => {
  let best = null;
  let bd = Infinity;
  for (const id of graphNodes) {
    const d = metres(pt, nodes.get(id));
    if (d < bd) [best, bd] = [id, d];
  }
  return { id: best, d: bd };
};

// Dijkstra from the project, with a binary heap.
const start = nearest([pinLat, pinLng]);
const dist = new Map([[start.id, start.d]]);
const heap = [[start.d, start.id]];
const push = (item) => {
  heap.push(item);
  for (let i = heap.length - 1; i > 0; ) {
    const p = (i - 1) >> 1;
    if (heap[p][0] <= heap[i][0]) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
};
const pop = () => {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length) {
    heap[0] = last;
    for (let i = 0; ; ) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
      if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }
  return top;
};
while (heap.length) {
  const [d, id] = pop();
  if (d > (dist.get(id) ?? Infinity)) continue;
  for (const [n, w] of graph.get(id) ?? []) {
    const nd = d + w;
    if (nd < (dist.get(n) ?? Infinity)) {
      dist.set(n, nd);
      push([nd, n]);
    }
  }
}
const walk = (pt) => {
  const n = nearest(pt);
  return (dist.get(n.id) ?? Infinity) + n.d;
};

/* ---------------------------------------------------------------- services */

function kindOf(t) {
  if (t.railway === "station" && (t.station === "subway" || t.subway === "yes")) return ["transport", "metro"];
  if (t.railway === "station" || t.railway === "halt") return ["transport", "train"];
  if (t.railway === "tram_stop") return ["transport", "tram"];
  if (t.highway === "bus_stop") return ["transport", "bus"];
  if (t.amenity === "kindergarten" || t.amenity === "childcare") return ["school", "kindergarten"];
  if (t.amenity === "school") return ["school", "school"];
  if (t.amenity === "university" || t.amenity === "college") return ["school", "university"];
  if (t.shop === "supermarket") return ["shop", "supermarket"];
  if (t.amenity === "marketplace") return ["shop", "market"];
  if (t.amenity === "pharmacy" && t.dispensing !== "no" && !/parafarmacia/i.test(t.name ?? "")) return ["health", "pharmacy"];
  if (t.amenity === "hospital" || t.amenity === "clinic") return ["health", "hospital"];
  if (t.amenity === "doctors") return ["health", "doctors"];
  if (t.leisure === "park" && t.name) return ["park", "park"];
  if (t.leisure === "sports_centre" || t.leisure === "fitness_centre") return ["sport", "sport"];
  return null;
}

const found = [];
const consider = (t, pts) => {
  const kind = kindOf(t);
  if (!kind) return;
  const name = t.name ?? "";
  if (!name && kind[1] !== "bus") return;
  const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
  if (c[0] < minLat || c[0] > maxLat || c[1] < minLon || c[1] > maxLon) return;
  // A park is reached at its nearest edge.
  const metresAway = kind[0] === "park" ? Math.min(...pts.filter((_, i) => i % Math.ceil(pts.length / 40) === 0).map(walk)) : walk(c);
  found.push({ cat: kind[0], kind: kind[1], name, meters: Math.round(metresAway), at: px(c[0], c[1]) });
};
for (const [id, t] of nodeTags) consider(t, [nodes.get(id)]);
for (const { refs, tags: t } of ways.values()) {
  const pts = refs.map((id) => nodes.get(id)).filter(Boolean);
  if (pts.length) consider(t, pts);
}

const PER_CAT = { transport: 5, school: 4, shop: 3, health: 3, park: 3, sport: 2 };
const services = [];
for (const cat of Object.keys(PER_CAT)) {
  const seen = new Set();
  const list = found
    .filter((s) => s.cat === cat && Number.isFinite(s.meters) && s.meters < 1600)
    .sort((a, b) => a.meters - b.meters)
    .filter((s) => {
      // One entry per place (a bus stop has one pole per direction, a school one node per building); then for
      // transport the rail and metro stations first, the buses after.
      const key = s.kind + ":" + s.name.toLowerCase().replace(/^(asilo nido|scuola (dell'infanzia|materna|primaria|secondaria)|nido)\s+/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const pick = cat === "transport" ? [...list.filter((s) => s.kind !== "bus").slice(0, 3), ...list.filter((s) => s.kind === "bus").slice(0, 2)] : list.slice(0, PER_CAT[cat]);
  for (const s of pick.sort((a, b) => a.meters - b.meters))
    services.push({ ...s, minutes: Math.max(1, Math.round(s.meters / 80)), at: s.at.map(r1) });
}

/* ---------------------------------------------------------------- output */

const L = layers;
const metroLabels = found.filter((s) => s.kind === "metro" && inside(s.at)).filter((s, i, all) => all.findIndex((x) => x.name === s.name) === i);
const SANS = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";
let angle = street ? (Math.atan2(street.by - street.ay, street.bx - street.ax) * 180) / Math.PI : 0;
if (angle > 90) angle -= 180;
if (angle < -90) angle += 180;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#f3f5f2"/>
<path d="${L.parks.join("")}" fill="#d3e6cc"/>
<path d="${L.water.join("")}" fill="#bfd9e8"/>
<path d="${L.buildings.join("")}" fill="#dde1dd" stroke="#cdd3ce" stroke-width="0.6"/>
<g fill="none" stroke-linecap="round" stroke-linejoin="round">
<defs><path id="mi" d="${L.minor.join("")}"/><path id="ma" d="${L.major.join("")}"/><path id="ra" d="${L.rail.join("")}"/></defs>
<use href="#mi" stroke="#c8cec9" stroke-width="6"/>
<use href="#ma" stroke="#b9c0bb" stroke-width="10"/>
<use href="#mi" stroke="#fff" stroke-width="4"/>
<use href="#ma" stroke="#fff" stroke-width="7.5"/>
<path d="${L.paths.join("")}" stroke="#b5bdb7" stroke-width="1.4" stroke-dasharray="3 4"/>
<path d="${L.tram.join("")}" stroke="#8d9691" stroke-width="1.4" stroke-dasharray="6 4"/>
<use href="#ra" stroke="#59615d" stroke-width="3.2"/>
<use href="#ra" stroke="#fff" stroke-width="1.6" stroke-dasharray="8 8"/>
</g>
${parkLabels
  .filter((p) => inside(p.at))
  .map((p) => `<text x="${r1(p.at[0])}" y="${r1(p.at[1])}" text-anchor="middle" font-size="13" font-style="italic" fill="#3f6b3c" stroke="#d3e6cc" stroke-width="3" paint-order="stroke" font-family="${SANS}">${esc(p.text)}</text>`)
  .join("\n")}
${metroLabels
  .map(
    (s) => `<g transform="translate(${r1(s.at[0])} ${r1(s.at[1])})"><rect x="-15" y="-11" width="30" height="22" rx="3" fill="#f9bb00" stroke="#121514" stroke-width="1.5"/><text y="5" text-anchor="middle" font-size="13" font-weight="700" fill="#121514" font-family="${MONO}">M3</text><text x="22" y="5" font-size="15" font-weight="600" fill="#121514" stroke="#f3f5f2" stroke-width="4" paint-order="stroke" font-family="${SANS}">${esc(s.name)}</text></g>`,
  )
  .join("\n")}
${street ? `<text transform="translate(${r1((street.ax + street.bx) / 2)} ${r1((street.ay + street.by) / 2 - 9)}) rotate(${r1(angle)})" text-anchor="middle" font-size="12.5" letter-spacing="1" fill="#39403d" stroke="#f3f5f2" stroke-width="4" paint-order="stroke" font-family="${MONO}">${esc((args.label ?? street.name).toUpperCase())}</text>` : ""}
</svg>
`;

const svgFile = join(root, "public", "media", "maps", `${args.id}.svg`);
mkdirSync(dirname(svgFile), { recursive: true });
writeFileSync(svgFile, svg);
mkdirSync(dirname(args.json), { recursive: true });
writeFileSync(
  args.json,
  `{
 "svg": "/media/maps/${args.id}.svg",
 "viewBox": [${W}, ${H}],
 "pin": [${r1(pinX)}, ${r1(pinY)}],
 "attribution": "© OpenStreetMap contributors",
 "services": [
${services.map((s) => "  " + JSON.stringify({ cat: s.cat, kind: s.kind, name: s.name, meters: s.meters, minutes: s.minutes, at: s.at })).join(",\n")}
 ]
}
`,
);
console.log(`${svgFile}: ${(svg.length / 1024).toFixed(0)} KB, ${W}×${H}; ${services.length} services from ${found.length} candidates; ${graph.size} walkable nodes`);
for (const s of services) console.log(`  ${s.cat.padEnd(9)} ${s.kind.padEnd(12)} ${String(s.minutes).padStart(2)} min  ${s.name}`);
