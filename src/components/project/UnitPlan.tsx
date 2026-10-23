import { prepareBuilding, type Floor, type RoomGroup } from "@/components/building3d/plan";
import { strings3d } from "@/components/building3d/strings";
import { formatNumber, tr } from "@/lib/format";
import type { BuildingPlan, Locale, Point } from "@/lib/types";

/* An apartment's floor plan, drawn on the server as SVG for its sheet: the walls cut at a metre from the floor, doors
   and windows, its rooms coloured and named with their areas, the rest of the floor in grey, overall dimensions, a
   north arrow and a scale bar. Lengths in metres; the street side is at the top. */

const FILL: Record<RoomGroup, string> = {
  day: "#f3dccd",
  night: "#dfe3f6",
  bath: "#d6eaf1",
  serv: "#ebe5da",
  dist: "#e6e9e7",
  out: "#dcebd9",
  plant: "#ecebd6",
};

export function UnitPlan({ plan, unitId, locale, title }: { plan: BuildingPlan; unitId: string; locale: Locale; title: string }) {
  const b = prepareBuilding(plan);
  const s = strings3d[locale];
  const floors = b.floors.filter((f) => f.rooms.some((r) => r.unitId === unitId));
  if (!floors.length) return null;
  return (
    <div className="grid gap-6">
      {floors.map((f) => (
        <FloorDrawing
          key={f.id}
          floor={f}
          plan={plan}
          unitId={unitId}
          locale={locale}
          title={`${title} · ${tr(f.name, locale)}`}
          roofLabel={f.roof ? tr(f.name, locale) : null}
          kinds={s.kinds}
        />
      ))}
    </div>
  );
}

function FloorDrawing({
  floor: f,
  plan,
  unitId,
  locale,
  title,
  roofLabel,
  kinds,
}: {
  floor: Floor;
  plan: BuildingPlan;
  unitId: string;
  locale: Locale;
  title: string;
  roofLabel: string | null;
  kinds: Record<string, string>;
}) {
  const own = f.rooms.filter((r) => r.unitId === unitId);
  // Dimensions of the indoor rooms (all of them on a roof, where there are only terraces).
  const measured = own.some((r) => !r.outdoor) ? own.filter((r) => !r.outdoor) : own;
  const xs = measured.flatMap((r) => r.poly.map((p) => p[0]));
  const ys = measured.flatMap((r) => r.poly.map((p) => p[1]));
  const [ux0, ux1, uy0, uy1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const fx = plan.footprint.map((p) => p[0]);
  const fy = plan.footprint.map((p) => p[1]);
  const allX = [...fx, ...own.flatMap((r) => r.poly.map((p) => p[0]))];
  const allY = [...fy, ...own.flatMap((r) => r.poly.map((p) => p[1]))];
  const [x0, x1, y0, y1] = [Math.min(...allX), Math.max(...allX), Math.min(...allY), Math.max(...allY)];
  const m = 2.6;
  const vb = [x0 - m - 1.4, y0 - m - 1.2, x1 - x0 + 2 * m + 2.8, y1 - y0 + 2 * m + 2.6];
  const d = (poly: Point[]) => poly.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join("") + "Z";
  const n = (v: number, dec = 2) => formatNumber(v, locale, dec, dec);
  // Walls cut a metre above the floor: full-height pieces and the parapets of a roof.
  const cut = f.walls.filter((w) => w.h0 <= 1 && w.h1 > 1);
  const details = f.details.filter((sg) => Math.abs(sg[0] - sg[3]) + Math.abs(sg[2] - sg[5]) > 1e-3);
  const ownDetails = details.filter(([ax, , ay, bx, , by]) => {
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    return mx > ux0 - 0.4 && mx < ux1 + 0.4 && my > uy0 - 0.4 && my < uy1 + 0.4;
  });
  const north =
    plan.facing !== undefined
      ? (() => {
          const o = ((0 - plan.facing) * Math.PI) / 180;
          return [-Math.sin(o), -Math.cos(o)] as const;
        })()
      : null;
  const nc: Point = [x1 + m - 0.2, y0 - m + 0.6];

  return (
    <figure className="grid gap-2">
      {roofLabel && <figcaption className="label text-mute">{roofLabel}</figcaption>}
      <svg viewBox={vb.join(" ")} className="block h-auto w-full" role="img" aria-label={title} fontFamily="var(--font-sans), system-ui, sans-serif">
        {/* the rest of the floor */}
        <path d={d(plan.footprint)} fill="#f4f6f3" stroke="none" />
        {f.rooms
          .filter((r) => r.unitId !== unitId && r.outdoor)
          .map((r) => (
            <path key={r.id} d={d(r.poly)} fill="#eef1ee" stroke="#c9cfca" strokeWidth={0.03} />
          ))}
        {/* the apartment */}
        {own.map((r) => (
          <path
            key={r.id}
            d={d(r.poly)}
            fill={FILL[r.group]}
            stroke={r.outdoor ? "#7d8681" : "none"}
            strokeWidth={0.03}
            strokeDasharray={r.outdoor ? "0.15 0.1" : undefined}
          />
        ))}
        {details.map(([ax, , ay, bx, , by], i) => (
          <line key={i} x1={ax} y1={ay} x2={bx} y2={by} stroke={ownDetails.includes(details[i]) ? "#39403d" : "#b9c0bb"} strokeWidth={0.025} />
        ))}
        {cut.map((w, i) => (
          <rect key={i} x={w.x0} y={w.y0} width={w.x1 - w.x0} height={w.y1 - w.y0} fill="#121514" />
        ))}
        <path d={d(plan.footprint)} fill="none" stroke="#121514" strokeWidth={0.02} />

        {/* names and areas */}
        {own.map((r) => (
          <text key={r.id} x={r.anchor[0]} y={r.anchor[1]} textAnchor="middle" fill="#121514">
            <tspan x={r.anchor[0]} fontSize={0.4} fontWeight={600}>
              {r.name ? tr(r.name, locale) : kinds[r.kind]}
            </tspan>
            <tspan x={r.anchor[0]} dy={0.46} fontSize={0.34} fill="#5f6864">
              {n(r.area, 1)} m²
            </tspan>
          </text>
        ))}

        {/* overall dimensions of the apartment */}
        <g stroke="#39403d" strokeWidth={0.025} fill="#39403d" fontSize={0.4} fontFamily="var(--font-mono), ui-monospace, monospace">
          <line x1={ux0} y1={y0 - m + 0.9} x2={ux1} y2={y0 - m + 0.9} />
          {[ux0, ux1].map((x) => (
            <line key={x} x1={x} y1={y0 - m + 0.6} x2={x} y2={y0 - 0.25} strokeDasharray="0.08 0.08" />
          ))}
          {[ux0, ux1].map((x) => (
            <line key={`t${x}`} x1={x - 0.15} y1={y0 - m + 1.05} x2={x + 0.15} y2={y0 - m + 0.75} />
          ))}
          <text x={(ux0 + ux1) / 2} y={y0 - m + 0.75} textAnchor="middle" stroke="none">
            {n(ux1 - ux0)} m
          </text>
          <line x1={x0 - m + 0.9} y1={uy0} x2={x0 - m + 0.9} y2={uy1} />
          {[uy0, uy1].map((y) => (
            <line key={y} x1={x0 - m + 0.6} y1={y} x2={x0 - 0.25} y2={y} strokeDasharray="0.08 0.08" />
          ))}
          {[uy0, uy1].map((y) => (
            <line key={`t${y}`} x1={x0 - m + 0.75} y1={y + 0.15} x2={x0 - m + 1.05} y2={y - 0.15} />
          ))}
          <text transform={`translate(${x0 - m + 0.75} ${(uy0 + uy1) / 2}) rotate(-90)`} textAnchor="middle" stroke="none">
            {n(uy1 - uy0)} m
          </text>
        </g>

        {/* the street, north and scale */}
        {plan.street && (
          <text
            x={(x0 + x1) / 2}
            y={y0 - m - 0.4}
            textAnchor="middle"
            fontSize={0.3}
            letterSpacing={0.12}
            fill="#5f6864"
            fontFamily="var(--font-mono), ui-monospace, monospace"
          >
            {plan.street.toUpperCase()}
          </text>
        )}
        {north && (
          <g stroke="#121514" strokeWidth={0.04} fill="none">
            <circle cx={nc[0]} cy={nc[1]} r={0.55} />
            <line x1={nc[0] - north[0] * 0.55} y1={nc[1] - north[1] * 0.55} x2={nc[0] + north[0] * 1.05} y2={nc[1] + north[1] * 1.05} />
            <text
              x={nc[0] + north[0] * 1.45}
              y={nc[1] + north[1] * 1.45 + 0.12}
              textAnchor="middle"
              fontSize={0.36}
              fontWeight={700}
              fill="#121514"
              stroke="none"
            >
              N
            </text>
          </g>
        )}
        <g transform={`translate(${x1 + m - 5.2} ${y1 + m + 0.4})`} fontSize={0.28} fill="#39403d" fontFamily="var(--font-mono), ui-monospace, monospace">
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={i} y={0} width={1} height={0.16} fill={i % 2 ? "#ffffff" : "#121514"} stroke="#121514" strokeWidth={0.02} />
          ))}
          <text x={0} y={0.6}>
            0
          </text>
          <text x={5} y={0.6} textAnchor="end">
            5 m
          </text>
        </g>
      </svg>
    </figure>
  );
}
