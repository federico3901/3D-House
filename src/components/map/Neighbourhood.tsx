"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { asset } from "@/lib/paths";
import { nearestByCategory, type AreaMapData, type ServiceCategory } from "@/tenants/maps";

/* The neighbourhood around a project: the map drawn from OpenStreetMap (scripts/build-map.mjs, loaded as an image
   when it comes near the screen) with the nearby services on it, and their list with walking times. Pointing at a
   service in the list shows it on the map, and the other way round. */

const CATS: { id: ServiceCategory; icon: IconName; color: string }[] = [
  { id: "transport", icon: "transit", color: "#1d5fa8" },
  { id: "shop", icon: "cart", color: "#b4520f" },
  { id: "school", icon: "school", color: "#7a3fa6" },
  { id: "health", icon: "health", color: "#b42a2a" },
  { id: "park", icon: "tree", color: "#2f7034" },
  { id: "sport", icon: "sport", color: "#0d6d76" },
];
const colorOf = Object.fromEntries(CATS.map((c) => [c.id, c.color])) as Record<ServiceCategory, string>;

export function Neighbourhood({ map, pinLabel, title }: { map: AreaMapData; pinLabel: string; title: string }) {
  const { locale, t } = useLocale();
  const a = t.area;
  const [cat, setCat] = useState<ServiceCategory | "all">("all");
  const [active, setActive] = useState<number | null>(null);
  const [w, h] = map.viewBox;
  const pos = (at: number[]) => ({ left: `${(at[0] / w) * 100}%`, top: `${(at[1] / h) * 100}%` });

  // Numbered in list order: by category, then nearest first.
  const order = CATS.map((c) => c.id);
  const services = map.services
    .map((s, i) => ({ ...s, i }))
    .sort((x, y) => order.indexOf(x.cat) - order.indexOf(y.cat) || x.minutes - y.minutes)
    .map((s, n) => ({ ...s, n: n + 1 }));
  const shown = services.filter((s) => cat === "all" || s.cat === cat);
  const present = CATS.filter((c) => services.some((s) => s.cat === c.id));
  const nearest = nearestByCategory(map.services).map((s) => ({
    ...CATS.find((c) => c.id === s.cat)!,
    s,
    label: s.cat === "transport" ? a.kinds[s.kind as keyof typeof a.kinds] : a.cats[s.cat],
  }));
  const km = (m: number) => (m < 1000 ? `${m} m` : `${formatNumber(m / 1000, locale, 1)} km`);

  return (
    <div className="grid gap-6">
      {/* At a glance: the nearest of each kind */}
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {nearest.map((c) => (
          <li key={c.id + c.s.name} className="grid gap-1 bg-board px-4 py-3">
            <span className="label flex items-center gap-1.5 text-mute">
              <span style={{ color: c.color }}>
                <Icon name={c.icon} size={16} />
              </span>
              {c.label}
            </span>
            <span className="heading text-[1.35rem]">
              {c.s.minutes} <span className="text-[0.9rem] font-medium text-mute">min</span>
            </span>
            <span className="truncate text-[0.82rem] text-ink-2" title={c.s.name}>
              {c.s.name}
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-8">
        <div className="grid content-start gap-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label={a.filter}>
            {[{ id: "all" as const, icon: "pin" as IconName, color: "var(--ink)" }, ...present].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={cat === c.id}
                onClick={() => setCat(c.id)}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-[0.86rem] font-medium transition-colors ${
                  cat === c.id ? "border-ink bg-ink text-board" : "border-line-strong bg-board text-ink hover:border-ink"
                }`}
              >
                {c.id !== "all" && <span className="h-2 w-2 rounded-full" style={{ background: c.color }} aria-hidden="true" />}
                {c.id === "all" ? a.all : a.cats[c.id]}
              </button>
            ))}
          </div>

          <ol className="grid max-h-[34rem] overflow-y-auto rounded-[var(--radius)] border border-line bg-board">
            {shown.map((s) => (
              <li
                key={s.i}
                onMouseEnter={() => setActive(s.i)}
                onMouseLeave={() => setActive(null)}
                className={`grid grid-cols-[1.75rem_1fr_auto] items-center gap-3 border-t border-line px-3 py-2.5 first:border-t-0 ${active === s.i ? "bg-board-2" : ""}`}
              >
                <span
                  className="num grid h-6 w-6 place-items-center rounded-full text-[0.72rem] font-semibold text-white"
                  style={{ background: colorOf[s.cat] }}
                >
                  {s.n}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium" title={s.name}>
                    {s.name || a.kinds[s.kind as keyof typeof a.kinds]}
                  </span>
                  <span className="block text-[0.8rem] text-mute">{a.kinds[s.kind as keyof typeof a.kinds] ?? s.kind}</span>
                </span>
                <span className="text-right">
                  <span className="num flex items-center justify-end gap-1 text-[0.92rem] font-semibold">
                    <Icon name="walk" size={15} />
                    {s.minutes}&nbsp;min
                  </span>
                  <span className="num block text-[0.75rem] text-mute">{km(s.meters)}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[0.82rem] text-mute">{a.note}</p>
        </div>

        <figure className="relative self-start overflow-hidden rounded-[var(--radius)] border border-line bg-[#f3f5f2]" style={{ aspectRatio: `${w} / ${h}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset(map.svg)} alt={title} width={w} height={h} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full" />

          {shown.map((s) => {
            const on = active === s.i;
            return (
              // A picture of the list beside it, which says the same to keyboards and screen readers.
              <span
                key={s.i}
                data-marker
                aria-hidden="true"
                onMouseEnter={() => setActive(s.i)}
                onMouseLeave={() => setActive(null)}
                className="absolute grid h-6 w-6 cursor-default place-items-center rounded-full border-2 border-white text-[0.66rem] font-bold text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-transform"
                style={{ ...pos(s.at), background: colorOf[s.cat], transform: `translate(-50%, -50%) scale(${on ? 1.3 : 1})`, zIndex: on ? 3 : 1 }}
              >
                <span className="num">{s.n}</span>
              </span>
            );
          })}

          {/* The project */}
          <div className="pointer-events-none absolute z-[2]" style={pos(map.pin)} aria-hidden="true">
            <span className="absolute h-[52px] w-[52px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/25" />
            <span className="absolute h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-ink bg-brand" />
            <span className="absolute left-0 top-4 -translate-x-1/2 whitespace-nowrap rounded-[3px] bg-ink px-2 py-1 text-[0.78rem] font-bold text-white">
              {pinLabel}
            </span>
          </div>

          {/* The service pointed at */}
          {active !== null &&
            services
              .filter((s) => s.i === active && shown.includes(s))
              .map((s) => (
                <div
                  key={s.i}
                  className="pointer-events-none absolute z-[4] whitespace-nowrap rounded-[3px] border border-line bg-board px-2 py-1 text-[0.78rem] shadow-md"
                  // Kept inside the map near its edges.
                  style={{ ...pos(s.at), transform: `translate(${s.at[0] < w * 0.25 ? "-12px" : s.at[0] > w * 0.75 ? "calc(12px - 100%)" : "-50%"}, 16px)` }}
                >
                  <b>{s.name}</b> · {a.walk(s.minutes)}
                </div>
              ))}

          <figcaption className="absolute bottom-0 right-0 bg-[#f3f5f2]/90 px-2 py-1 text-[0.7rem] text-mute">{map.attribution}</figcaption>
        </figure>
      </div>
    </div>
  );
}
