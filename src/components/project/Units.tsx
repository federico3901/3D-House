"use client";

import { useState } from "react";
import { askAbout } from "@/components/home/ContactSection";
import { UnitStatusChip } from "@/components/ui/Status";
import { floorLabel } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import type { Project, Unit } from "@/lib/types";

export function Units({ project }: { project: Project }) {
  const { locale, t } = useLocale();
  const [onlyFree, setOnlyFree] = useState(false);
  const units = project.units.filter((u) => !onlyFree || u.status === "available");
  const counts = { available: 0, reserved: 0, sold: 0 };
  project.units.forEach((u) => counts[u.status]++);

  const ask = (u: Unit) =>
    askAbout(
      project.slug,
      locale === "it"
        ? `Vorrei informazioni sull'appartamento ${u.name} (${t.rooms(u.rooms).toLowerCase()}, ${u.area} m²) di ${project.name}.`
        : `I'd like information on apartment ${u.name} (${t.rooms(u.rooms)}, ${u.area} m²) at ${project.name}.`,
    );
  const outdoor = (u: Unit) => (u.outdoor ? `${t.outdoor[u.outdoor.kind]} ${u.outdoor.area} m²` : "—");

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex flex-wrap gap-2 text-[0.9rem]">
          {(["available", "reserved", "sold"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <UnitStatusChip status={s} />
              <span className="num text-mute">{counts[s]}</span>
            </span>
          ))}
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-[0.92rem] font-medium">
          <input id={`units-free-${project.slug}`} type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
          {t.project.onlyAvailable}
        </label>
      </div>

      {/* Table from tablet up */}
      <div className="hidden overflow-hidden rounded-[var(--radius)] border border-line bg-board sm:block">
        <table className="w-full text-left text-[0.95rem]">
          <thead className="bg-board-2">
            <tr className="label text-mute">
              <th className="px-4 py-3 font-medium">{t.project.unit}</th>
              <th className="px-4 py-3 font-medium">{t.project.floor}</th>
              <th className="px-4 py-3 font-medium">{t.project.layout}</th>
              <th className="px-4 py-3 text-right font-medium">{t.project.area}</th>
              <th className="px-4 py-3 font-medium">{t.project.outdoor}</th>
              <th className="px-4 py-3 font-medium">{t.project.state}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="heading px-4 py-3 text-lg">{u.name}</td>
                <td className="num px-4 py-3">{floorLabel(u.floor, locale)}</td>
                <td className="px-4 py-3">
                  {t.rooms(u.rooms)} <span className="text-mute">· {u.bathrooms} {locale === "it" ? (u.bathrooms > 1 ? "bagni" : "bagno") : u.bathrooms > 1 ? "baths" : "bath"}</span>
                </td>
                <td className="num px-4 py-3 text-right">{u.area} m²</td>
                <td className="px-4 py-3 text-ink-2">{outdoor(u)}</td>
                <td className="px-4 py-3">
                  <UnitStatusChip status={u.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {u.status !== "sold" && (
                    <button type="button" onClick={() => ask(u)} className="btn btn-line min-h-9 px-3 py-1.5 text-[0.85rem]">
                      {t.project.ask}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards on phones */}
      <ul className="grid gap-2 sm:hidden">
        {units.map((u) => (
          <li key={u.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 rounded-[var(--radius)] border border-line bg-board p-4">
            <span className="heading row-span-2 text-2xl">{u.name}</span>
            <span className="text-[0.95rem] font-semibold">
              {t.rooms(u.rooms)} · <span className="num">{u.area} m²</span>
            </span>
            <span className="row-span-2">
              <UnitStatusChip status={u.status} />
            </span>
            <span className="text-[0.85rem] text-mute">
              {t.project.floor} {floorLabel(u.floor, locale)} · {outdoor(u)}
            </span>
            {u.status !== "sold" && (
              <button type="button" onClick={() => ask(u)} className="btn btn-line col-span-3 mt-2 min-h-10 py-1.5 text-[0.9rem]">
                {t.project.ask}
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="text-[0.85rem] text-mute">{t.project.unitsLead}</p>
    </div>
  );
}
