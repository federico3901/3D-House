import type { BuildingPlan, L10n, Locale, Point } from "@/lib/types";
import { prepareBuilding, type RoomGroup } from "./plan";
import { strings3d } from "./strings";

/* An exploded axonometric of the floor plans, drawn on the server as SVG: the preview of the 3D view on the project
   page, in its colours (Silhouette). Floors are painted bottom to top, each hiding what lies under it. */

const GROUP_COLOR: Record<RoomGroup, string> = {
  day: "#ffb547",
  night: "#9fb6ff",
  bath: "#4fb8ff",
  serv: "#d9cdb4",
  dist: "#9a9a9a",
  out: "#5fd38d",
  plant: "#e8d25a",
};

const COS = Math.cos(Math.PI / 6);
const GAP = 3.2;

export function PlanPreview({ plan, locale, title }: { plan: BuildingPlan; locale: Locale; title: string }) {
  const b = prepareBuilding(plan);
  const s = strings3d[locale];
  const step = plan.storey + GAP;
  // Seen from the street side: x runs right and down, y (towards the back) right and up, z up.
  const proj = (x: number, y: number, z: number): Point => [(x + y) * COS, (x - y) * 0.5 - z];
  const path = (poly: Point[], z: number) => poly.map(([x, y], i) => `${i ? "L" : "M"}${proj(x, y, z).map((n) => n.toFixed(2)).join(" ")}`).join("") + "Z";

  const pts = b.floors.flatMap((f) => {
    const z = f.level * step;
    const [x0, y0, x1, y1] = f.bounds;
    return [proj(x0, y0, z), proj(x1, y0, z), proj(x0, y1, z), proj(x1, y1, z), proj(x1, y0, z - plan.slab)];
  });
  const minX = Math.min(...pts.map((p) => p[0])) - 1;
  const maxX = Math.max(...pts.map((p) => p[0])) + 19;
  const minY = Math.min(...pts.map((p) => p[1])) - 2;
  const maxY = Math.max(...pts.map((p) => p[1])) + 2;
  const corners = b.plan.footprint;
  const back = Math.max(...b.floors.map((f) => f.bounds[3]));

  return (
    <svg viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} className="block h-auto w-full" role="img" aria-label={title}>
      {b.floors.map((f, i) => {
        const z = f.level * step;
        const next = b.floors[i + 1];
        // Beside the floor's right-hand corner, clear of the drawing.
        const label = proj(b.x1, back + 1.2, z);
        return (
          <g key={f.id}>
            {/* slab edge, then the floor itself */}
            <path d={path(corners, z - plan.slab)} fill="#050606" stroke="rgba(255,255,255,0.18)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <path d={path(corners, z)} fill="#0b0e0d" stroke="none" />
            {f.rooms.map((r) => (
              <path
                key={r.id}
                d={path(r.poly, z)}
                fill={GROUP_COLOR[r.group]}
                fillOpacity={r.outdoor ? 0.14 : 0.2}
                stroke="rgba(255,255,255,0.42)"
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={path(corners, z)} fill="none" stroke="#53e2cf" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            {next &&
              corners.map(([x, y]) => {
                const [ax, ay] = proj(x, y, z);
                const [bx, by] = proj(x, y, next.level * step - plan.slab);
                return <line key={`${x}-${y}`} x1={ax} y1={ay} x2={bx} y2={by} stroke="rgba(83,226,207,0.35)" strokeWidth={0.8} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />;
              })}
            <text x={label[0] + 1.2} y={label[1] + 0.45} fontSize={1.3} fill="#e6e6e6" fontFamily="ui-monospace, Menlo, monospace" letterSpacing={0.12}>
              {s.code(f.level, f.roof)} · {(f.name as L10n)[locale].toUpperCase()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
