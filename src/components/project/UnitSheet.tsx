"use client";

import { AppLink } from "@/components/ui/AppLink";
import { Icon, type IconName } from "@/components/ui/Icon";
import { UnitStatusChip } from "@/components/ui/Status";
import type { UnitSun } from "@/lib/exposure";
import { euro, floorLabel, formatNumber, monthYear, tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { ESTIMATES, purchaseCosts } from "@/lib/purchase";
import { useProject, useTenant } from "@/lib/store";
import { SEASONS } from "@/lib/sun";
import type { Service } from "@/tenants/maps";

/* An apartment's sheet, to read on screen or print on one A4 page: plan, figures, rooms, exposure, what it costs
   and what is near. Status and price are live (the builder can change them); the plan, rooms, sun and services are
   worked out at build time and passed in. */

const CAT_ICON: Record<Service["cat"], IconName> = { transport: "transit", shop: "cart", school: "school", health: "health", park: "tree", sport: "sport" };

export interface SheetRoom {
  id: string;
  name: string;
  area: number;
  outdoor: boolean;
}

export function UnitSheet({
  slug,
  unitId,
  plan,
  rooms,
  sun,
  services,
  has3d,
}: {
  slug: string;
  unitId: string;
  plan?: React.ReactNode;
  rooms: SheetRoom[];
  sun?: UnitSun;
  services: Service[];
  has3d: boolean;
}) {
  const project = useProject(slug);
  const { brand } = useTenant();
  const { locale, t } = useLocale();
  const unit = project?.units.find((u) => u.id === unitId);
  if (!project || !unit) return null;

  const sh = t.sheet;
  const back = `/${locale}/projects/${project.slug}/`;
  const costs = unit.price
    ? purchaseCosts({ price: unit.price, firstHome: true, loan: 0, years: 25, rate: 3, notary: ESTIMATES.notarySale, bankFees: 0 })
    : null;
  const indoor = rooms.filter((r) => !r.outdoor);
  const message =
    locale === "it"
      ? `Vorrei informazioni sull'appartamento ${unit.name} (${t.rooms(unit.rooms).toLowerCase()}, ${unit.area} m²) di ${project.name}.`
      : `I'd like information on apartment ${unit.name} (${t.rooms(unit.rooms)}, ${unit.area} m²) at ${project.name}.`;
  // The project page's contact section picks the request up when it opens.
  const remember = (key: string, value: object) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* the form opens empty */
    }
  };
  const figures: [string, string][] = [
    [sh.commercial, `${unit.area} m²`],
    [
      t.project.layout,
      `${t.rooms(unit.rooms)} · ${unit.bathrooms} ${locale === "it" ? (unit.bathrooms > 1 ? "bagni" : "bagno") : unit.bathrooms > 1 ? "baths" : "bath"}`,
    ],
    [t.project.floor, floorLabel(unit.floor, locale)],
    [t.project.outdoor, unit.outdoor ? `${t.outdoor[unit.outdoor.kind]} ${unit.outdoor.area} m²` : "—"],
    [sh.delivery, project.status === "completed" ? t.project.delivered : monthYear(project.delivery, locale)],
  ];

  return (
    <article className="wrap grid gap-8 py-10 print:max-w-none print:gap-5 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <AppLink href={back} className="flex items-center gap-2 text-[0.95rem] font-medium text-ink-2 hover:text-ink">
          <Icon name="back" size={18} />
          {project.name}
        </AppLink>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ink" onClick={() => window.print()}>
            <Icon name="print" size={18} />
            {sh.print}
          </button>
          {has3d && (
            <AppLink href={`/${locale}/projects/${project.slug}/3d/#${unit.id}`} className="btn btn-line">
              <Icon name="cube" size={18} />
              {t.project.unit3d}
            </AppLink>
          )}
        </div>
      </div>

      {/* Title block */}
      <header className="grid gap-4 border-b-2 border-ink pb-6 sm:grid-cols-[1fr_auto] sm:items-end print:pb-3">
        <div className="grid gap-2">
          <p className="label text-mute">
            {sh.title} · {project.name} · {tr(project.subtitle, locale)}
          </p>
          <h1 className="display text-[clamp(3rem,8vw,5.5rem)] print:text-[48px]">{unit.name}</h1>
          <p className="text-[1.05rem] text-ink-2">
            {t.rooms(unit.rooms)} · {unit.area} m² · {t.project.floor} {floorLabel(unit.floor, locale)} · {project.location.address}, {project.location.city}
          </p>
        </div>
        <div className="grid justify-items-start gap-2 sm:justify-items-end">
          <UnitStatusChip status={unit.status} />
          {unit.status !== "sold" && (
            <p className={`heading text-[2rem] ${unit.price ? "num" : ""}`}>{unit.price ? euro(unit.price, locale) : t.costs.onRequest}</p>
          )}
        </div>
      </header>

      {unit.status === "sold" && (
        <p className="rounded-[var(--radius)] bg-sold-bg px-4 py-3 text-[0.95rem] print:hidden">
          {sh.sold}{" "}
          <AppLink href={`${back}#appartamenti`} className="font-semibold underline underline-offset-4">
            {t.project.units}
          </AppLink>
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] print:grid-cols-[1.35fr_1fr] print:gap-5">
        {/* Plan */}
        <section className="grid content-start gap-3">
          <h2 className="label text-mute">{sh.plan}</h2>
          <div className="rounded-[var(--radius)] border border-line bg-board p-4 print:border-ink print:p-2">{plan}</div>
          <p className="text-[0.8rem] text-mute">{sh.planNote}</p>
        </section>

        <div className="grid content-start gap-7 print:gap-4">
          <section className="grid gap-2">
            <h2 className="label text-mute">{sh.figures}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 border-t border-line">
              {figures.map(([k, v]) => (
                <div key={k} className="col-span-2 grid grid-cols-subgrid border-b border-line py-2">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="text-right font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {rooms.length > 0 && (
            <section className="grid gap-2">
              <h2 className="label text-mute">{sh.rooms}</h2>
              <dl className="border-t border-line text-[0.95rem]">
                {rooms.map((r) => (
                  <div key={r.id} className="flex justify-between gap-4 border-b border-line py-1.5">
                    <dt className={r.outdoor ? "text-ink-2" : ""}>{r.name}</dt>
                    <dd className="num">{formatNumber(r.area, locale, 1, 1)} m²</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-4 py-1.5 font-semibold">
                  <dt>{sh.total}</dt>
                  <dd className="num">
                    {formatNumber(
                      indoor.reduce((n, r) => n + r.area, 0),
                      locale,
                      1,
                      1,
                    )}{" "}
                    m²
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {sun && (
            <section className="grid gap-2">
              <h2 className="label text-mute">{t.sun.exposure}</h2>
              <p className="flex items-center gap-2 font-semibold">
                <Icon name="compass" size={18} />
                {sun.facing.map((p) => t.sun.points[p]).join(" · ")}
              </p>
              <ul className="grid grid-cols-3 gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line text-center">
                {SEASONS.map((x) => (
                  <li key={x} className="grid gap-0.5 bg-board px-2 py-2">
                    <span className="label text-mute">{t.sun.seasons[x]}</span>
                    <span className="heading text-[1.3rem]">{formatNumber(sun.hours[x], locale, 1)} h</span>
                  </li>
                ))}
              </ul>
              <p className="text-[0.8rem] text-mute">{t.sun.note}</p>
            </section>
          )}
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 print:grid-cols-3 print:gap-5">
        {costs && unit.status !== "sold" && (
          <section className="grid content-start gap-2">
            <h2 className="label text-mute">{sh.costs}</h2>
            <p className="text-[0.85rem] text-ink-2">{sh.costsLead}</p>
            <dl className="border-t border-line text-[0.92rem]">
              {[
                [t.costs.vat(4), costs.vat],
                [t.costs.fixed, costs.fixedTaxes],
                [t.costs.stamps, costs.stamps],
                [t.costs.notary, costs.notary],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4 border-b border-line py-1.5">
                  <dt className="text-ink-2">{k}</dt>
                  <dd className="num whitespace-nowrap">{euro(v as number, locale)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-1.5 font-semibold">
                <dt>{t.costs.extras}</dt>
                <dd className="num whitespace-nowrap">{euro(costs.extras, locale)}</dd>
              </div>
            </dl>
            <AppLink href={`${back}#costi`} className="w-fit text-[0.9rem] font-semibold underline underline-offset-4 print:hidden">
              {sh.calc}
            </AppLink>
          </section>
        )}

        {services.length > 0 && (
          <section className="grid content-start gap-2">
            <h2 className="label text-mute">{sh.nearby}</h2>
            <ul className="border-t border-line text-[0.92rem]">
              {services.map((s) => (
                <li key={s.cat} className="flex items-center gap-2 border-b border-line py-1.5">
                  <Icon name={CAT_ICON[s.cat]} size={16} className="shrink-0 text-ink-2" />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="num whitespace-nowrap text-ink-2">{t.area.walk(s.minutes)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="grid content-start gap-2">
          <h2 className="label text-mute">{sh.features}</h2>
          <ul className="grid gap-1.5 text-[0.92rem]">
            {project.features.slice(0, 6).map((f) => (
              <li key={f.it} className="flex gap-2">
                <Icon name="check" size={16} className="mt-0.5 shrink-0" />
                {tr(f, locale)}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Contact */}
      <footer className="grid gap-4 border-t-2 border-ink pt-5 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid gap-1 text-[0.92rem]">
          <p className="heading text-[1.2rem]">{brand.name}</p>
          <p className="text-ink-2">
            {brand.phone} · {brand.email} · {brand.address}
          </p>
          {project.note && <p className="max-w-[90ch] text-[0.78rem] text-mute">{tr(project.note, locale)}</p>}
        </div>
        {unit.status !== "sold" && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <AppLink href={`${back}#contatti`} className="btn btn-line" onClick={() => remember("cl:visit", { project: project.slug })}>
              <Icon name="calendar" size={18} />
              {t.visit.book}
            </AppLink>
            <AppLink href={`${back}#contatti`} className="btn btn-brand" onClick={() => remember("cl:ask", { project: project.slug, message })}>
              {t.project.ask}
            </AppLink>
          </div>
        )}
      </footer>
    </article>
  );
}
