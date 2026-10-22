#!/usr/bin/env node
/* Draws the neighbourhood map of a project from OpenStreetMap data, as SVG paths in a JSON file that the project
   page renders inline (no map service, no iframe, no API key).

   node scripts/build-map.mjs --bbox 9.1630,45.5040,9.1830,45.5150 --pin 45.50853,9.17022 \
     --out src/tenants/demo/maps/grazioli-57.json [--osm saved.osm] [--label "Via Grazioli"]

   Without --osm the area is downloaded from the OSM API (small areas only). Map data © OpenStreetMap contributors,
   ODbL: the page shows the attribution. */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
if (!args.bbox || !args.pin || !args.out) {
  console.error("usage: build-map.mjs --bbox minLon,minLat,maxLon,maxLat --pin lat,lng --out file.json [--osm file]");
  process.exit(1);
}
const [minLon, minLat, maxLon, maxLat] = args.bbox.split(",").map(Number);
const [pinLat, pinLng] = args.pin.split(",").map(Number);

let xml;
if (args.osm) xml = readFileSync(args.osm, "utf8");
else {
  const res = await fetch(`https://api.openstreetmap.org/api/0.6/map?bbox=${args.bbox}`, {
    headers: { "User-Agent": "cantiere-live map builder" },
  });
  if (!res.ok) throw new Error(`OSM API ${res.status}`);
  xml = await res.text();
}

const W = 1000;
const k = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
const H = Math.round((W * (maxLat - minLat)) / ((maxLon - minLon) * k));
const px = (lat, lon) => [((lon - minLon) / (maxLon - minLon)) * W, ((maxLat - lat) / (maxLat - minLat)) * H];
const r = (n) => Math.round(n * 10) / 10;

const tagsOf = (body) => Object.fromEntries([...(body ?? "").matchAll(/<tag k="([^"]*)" v="([^"]*)"\/>/g)].map((m) => [m[1], m[2]]));

const nodes = new Map();
const pointLabels = [];
for (const m of xml.matchAll(/<node id="(\d+)"[^>]*?lat="([-\d.]+)" lon="([-\d.]+)"[^>]*?(?:\/>|>([\s\S]*?)<\/node>)/g)) {
  const lat = Number(m[2]);
  const lon = Number(m[3]);
  nodes.set(m[1], [lat, lon]);
  const t = tagsOf(m[4]);
  if (t.railway === "station" && t.name && t.station === "subway") pointLabels.push({ kind: "metro", text: t.name, lat, lon });
}

const layers = { buildings: [], parks: [], water: [], rail: [], tram: [], major: [], minor: [], paths: [] };
const names = [];
for (const m of xml.matchAll(/<way id="(\d+)"[^>]*>([\s\S]*?)<\/way>/g)) {
  const refs = [...m[2].matchAll(/<nd ref="(\d+)"\/>/g)].map((n) => n[1]);
  const pts = refs.map((id) => nodes.get(id)).filter(Boolean);
  if (pts.length < 2) continue;
  const t = tagsOf(m[2]);
  const closed = refs[0] === refs[refs.length - 1];
  const d =
    "M" +
    pts
      .map(([lat, lon]) => px(lat, lon).map(r).join(" "))
      .join(" ") +
    (closed ? "Z" : "");

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
  layers[layer].push(d);

  if (layer === "parks" && t.name && t.leisure === "park" && pts.length > 8) {
    const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
    pointLabels.push({ kind: "park", text: t.name, lat: c[0], lon: c[1], size: pts.length });
  }
  if ((layer === "major" || layer === "minor") && t.name) names.push({ name: t.name, pts });
}

// The name of the project's street, placed along the street segment closest to the pin.
const labels = pointLabels
  .filter((l) => l.lat > minLat && l.lat < maxLat && l.lon > minLon && l.lon < maxLon)
  .filter((l) => l.kind !== "park" || (l.size > 20 && /^(Parco|Giardino)\b/.test(l.text)))
  .map(({ kind, text, lat, lon }) => {
    const [x, y] = px(lat, lon).map(r);
    return { kind, text, x, y };
  });

const [pinX, pinY] = px(pinLat, pinLng).map(r);
let street = null;
for (const { name, pts } of names) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = px(...pts[i]);
    const [bx, by] = px(...pts[i + 1]);
    const dist = Math.hypot((ax + bx) / 2 - pinX, (ay + by) / 2 - pinY);
    if (!street || dist < street.dist) street = { name, dist, ax, ay, bx, by };
  }
}
if (street && args.label !== "") {
  let angle = (Math.atan2(street.by - street.ay, street.bx - street.ax) * 180) / Math.PI;
  if (angle > 90) angle -= 180;
  if (angle < -90) angle += 180;
  labels.push({ kind: "street", text: args.label ?? street.name, x: r((street.ax + street.bx) / 2), y: r((street.ay + street.by) / 2), angle: r(angle) });
}

const out = {
  viewBox: [W, H],
  pin: [pinX, pinY],
  layers: Object.fromEntries(Object.entries(layers).map(([key, ds]) => [key, ds.join("")])),
  labels,
  attribution: "© OpenStreetMap contributors",
};
mkdirSync(dirname(args.out), { recursive: true });
writeFileSync(args.out, JSON.stringify(out));
console.log(`${args.out}: ${W}×${H}, ${Object.entries(layers).map(([key, v]) => `${key} ${v.length}`).join(", ")}, ${labels.length} labels`);
