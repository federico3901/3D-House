import type { MapDrawing } from "@/tenants/maps";

/* The neighbourhood around a project, drawn from OpenStreetMap data (scripts/build-map.mjs). Server-rendered SVG:
   no map service, no iframe, works offline and inside sandboxed pages. */
export function AreaMap({ map, pinLabel, title }: { map: MapDrawing; pinLabel: string; title: string }) {
  const [w, h] = map.viewBox;
  const [px, py] = map.pin;
  const L = map.layers;
  return (
    <figure className="relative overflow-hidden rounded-[var(--radius)] border border-line bg-[#f3f5f2]">
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-label={title}>
        <rect width={w} height={h} fill="#f3f5f2" />
        <path d={L.parks} fill="#d3e6cc" />
        <path d={L.water} fill="#bfd9e8" />
        <path d={L.buildings} fill="#dde1dd" stroke="#cdd3ce" strokeWidth={0.6} />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={L.minor} stroke="#c8cec9" strokeWidth={6.5} />
          <path d={L.major} stroke="#b9c0bb" strokeWidth={11} />
          <path d={L.minor} stroke="#ffffff" strokeWidth={4.5} />
          <path d={L.major} stroke="#ffffff" strokeWidth={8.5} />
          <path d={L.paths} stroke="#b5bdb7" strokeWidth={1.4} strokeDasharray="3 4" />
          <path d={L.tram} stroke="#8d9691" strokeWidth={1.4} strokeDasharray="6 4" />
          <path d={L.rail} stroke="#59615d" strokeWidth={3.2} />
          <path d={L.rail} stroke="#ffffff" strokeWidth={1.6} strokeDasharray="8 8" />
        </g>

        {map.labels.map((l) =>
          l.kind === "metro" ? (
            <g key={l.text} transform={`translate(${l.x} ${l.y})`}>
              <rect x={-15} y={-11} width={30} height={22} rx={3} fill="#f9bb00" stroke="#121514" strokeWidth={1.5} />
              <text x={0} y={5} textAnchor="middle" fontSize={13} fontWeight={700} fill="#121514" fontFamily="var(--font-mono)">
                M3
              </text>
              <text x={22} y={5} fontSize={15} fontWeight={600} fill="#121514" stroke="#f3f5f2" strokeWidth={4} paintOrder="stroke" fontFamily="var(--font-sans)">
                {l.text}
              </text>
            </g>
          ) : l.kind === "street" ? (
            <text
              key={l.text}
              transform={`translate(${l.x} ${l.y - 9}) rotate(${l.angle ?? 0})`}
              textAnchor="middle"
              fontSize={12.5}
              letterSpacing={1}
              fill="#39403d"
              stroke="#f3f5f2"
              strokeWidth={4}
              paintOrder="stroke"
              fontFamily="var(--font-mono)"
            >
              {l.text.toUpperCase()}
            </text>
          ) : (
            <text
              key={l.text}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              fontSize={13}
              fontStyle="italic"
              fill="#3f6b3c"
              stroke="#d3e6cc"
              strokeWidth={3}
              paintOrder="stroke"
              fontFamily="var(--font-sans)"
            >
              {l.text}
            </text>
          ),
        )}

        <g transform={`translate(${px} ${py})`}>
          <circle r={34} fill="var(--brand)" opacity={0.18} />
          <circle r={18} fill="var(--brand)" opacity={0.35} />
          <circle r={9} fill="var(--brand)" stroke="#121514" strokeWidth={2.5} />
          <g transform="translate(18 -44)">
            <rect x={0} y={0} width={pinLabel.length * 9.4 + 22} height={30} rx={3} fill="#121514" />
            <text x={11} y={20} fontSize={15} fontWeight={700} fill="#ffffff" fontFamily="var(--font-sans)">
              {pinLabel}
            </text>
          </g>
        </g>
      </svg>
      <figcaption className="absolute bottom-0 right-0 bg-[#f3f5f2]/90 px-2 py-1 text-[0.7rem] text-mute">{map.attribution}</figcaption>
    </figure>
  );
}
