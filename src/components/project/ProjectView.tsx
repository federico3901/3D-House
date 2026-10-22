"use client";

import { useState } from "react";
import { ContactSection, askAbout } from "@/components/home/ContactSection";
import { TourPlayer } from "@/components/tour/TourPlayer";
import { AppLink } from "@/components/ui/AppLink";
import { Icon } from "@/components/ui/Icon";
import { ProjectStatusChip } from "@/components/ui/Status";
import { monthYear, tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { useProject, useTenant } from "@/lib/store";
import { Diary } from "./Diary";
import { Gallery } from "./Gallery";
import { Schedule } from "./Schedule";
import { Units } from "./Units";

/** A project page. `map` is the server-rendered neighbourhood drawing. */
export function ProjectView({ slug, map }: { slug: string; map?: React.ReactNode }) {
  const project = useProject(slug);
  const { brand } = useTenant();
  const { locale, t } = useLocale();
  const [tourIdx, setTourIdx] = useState(0);
  if (!project) return null;

  const tour = project.tours[Math.min(tourIdx, project.tours.length - 1)];
  const { location } = project;
  const osm = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=17/${location.lat}/${location.lng}`;

  const sections = [
    { id: "avanzamento", label: t.project.progress, show: true },
    { id: "diario", label: t.project.diary, show: project.updates.length > 0 },
    { id: "tour", label: t.project.tour, show: project.tours.length > 0 },
    { id: "appartamenti", label: t.project.units, show: project.units.length > 0 },
    { id: "posizione", label: t.project.location, show: true },
  ].filter((s) => s.show);

  return (
    <>
      <section className="wrap grid gap-8 pb-10 pt-8">
        <AppLink href={`/${locale}/projects/`} className="inline-flex w-fit items-center gap-2 text-[0.92rem] font-medium text-mute hover:text-ink">
          <Icon name="back" size={16} />
          {t.project.back}
        </AppLink>

        <div className="rise flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3">
            <ProjectStatusChip status={project.status} />
            <h1 className="display text-[clamp(2.6rem,7vw,5.2rem)]">{project.name}</h1>
            <p className="heading text-[clamp(1.15rem,2vw,1.5rem)] text-ink-2">{tr(project.subtitle, locale)}</p>
            <p className="flex items-center gap-1.5 text-mute">
              <Icon name="pin" size={18} />
              {location.address}, {location.district}, {location.city}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {project.tours.length > 0 && (
              <AppLink href={`/${locale}/projects/${project.slug}/tour/`} className="btn btn-brand">
                <Icon name="pano" />
                {t.projects.tour}
              </AppLink>
            )}
            <button
              type="button"
              className="btn btn-line"
              onClick={() => askAbout(project.slug, "")}
            >
              {t.nav.requestInfo}
            </button>
          </div>
        </div>

        <div className="rise rise-2">
          <Gallery photos={project.gallery} />
        </div>
      </section>

      {/* Section index, sticky under the header */}
      <nav className="sticky top-16 z-30 border-y border-line bg-ground/90 backdrop-blur-md" aria-label={project.name}>
        <div className="wrap scrollbar-none flex gap-1 overflow-x-auto py-2">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="shrink-0 rounded-[3px] px-3 py-1.5 text-[0.9rem] font-medium text-ink-2 hover:bg-board hover:text-ink">
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Overview and site board */}
      <section className="wrap grid gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="grid content-start gap-6">
          <h2 className="heading text-3xl">{t.project.overview}</h2>
          <p className="max-w-[62ch] text-[1.08rem] text-ink-2">{tr(project.description, locale)}</p>
          <div className="grid gap-3">
            <h3 className="label text-mute">{t.project.features}</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {project.features.map((f) => (
                <li key={f.it} className="flex items-start gap-2 text-[0.97rem]">
                  <Icon name="check" size={18} className="mt-0.5 shrink-0 text-ok" />
                  {tr(f, locale)}
                </li>
              ))}
            </ul>
          </div>
          <dl className="sheet mt-2 text-[0.95rem]">
            {project.facts.map((f) => (
              <div key={f.label.it} className="sheet-row">
                <dt className="text-mute">{tr(f.label, locale)}</dt>
                <dd className="font-medium">{tr(f.value, locale)}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The cartello di cantiere every Italian site must display, as a web element */}
        <aside className="h-fit border-[3px] border-ink bg-board p-1" aria-label={t.project.sign}>
          <div className="border border-ink">
            <div className="flex items-center justify-between gap-3 bg-ink px-4 py-3 text-board">
              <span className="label">{t.project.sign}</span>
              <span className="label num">{project.start.replace("-", ".")}</span>
            </div>
            <dl className="text-[0.95rem]">
              {[
                [t.project.signWork, `${t.project.signWorkValue} · ${project.name}`],
                [t.project.signPlace, `${location.address}, ${location.city}`],
                [t.project.signBuilder, brand.name],
                [t.project.signStart, monthYear(project.start, locale)],
                [project.status === "completed" ? t.project.delivered : t.project.signEnd, monthYear(project.delivery, locale)],
              ].map(([k, v]) => (
                <div key={k} className="grid grid-cols-[42%_1fr] border-t border-ink first:border-t-0">
                  <dt className="label border-r border-ink px-4 py-3 text-[0.66rem] leading-snug text-ink-2">{k}</dt>
                  <dd className="heading px-4 py-3 text-[1.02rem]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </section>

      <section id="avanzamento" className="scroll-mt-32 border-t border-line bg-board-2">
        <div className="wrap grid gap-8 py-14">
          <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">{t.project.progress}</h2>
          <Schedule project={project} />
        </div>
      </section>

      {project.updates.length > 0 && (
        <section id="diario" className="scroll-mt-32 border-t border-line">
          <div className="wrap grid gap-8 py-14">
            <div className="grid gap-2">
              <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">{t.project.diary}</h2>
              <p className="lead">{t.project.diaryLead}</p>
            </div>
            <Diary project={project} />
          </div>
        </section>
      )}

      {tour && (
        <section id="tour" className="on-night scroll-mt-32 bg-night text-night-ink">
          <div className="wrap grid gap-6 py-14">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="grid gap-2">
                <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">{t.project.tour}</h2>
                <p className="max-w-[60ch] text-night-mute">{t.project.tourLead}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {project.tours.length > 1 &&
                  project.tours.map((x, i) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setTourIdx(i)}
                      aria-pressed={i === tourIdx}
                      className="btn btn-ghost-night min-h-10 py-2 text-[0.88rem] aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink"
                    >
                      {tr(x.title, locale)}
                    </button>
                  ))}
                <AppLink href={`/${locale}/projects/${project.slug}/tour/`} className="btn btn-ghost-night min-h-10 py-2 text-[0.88rem]">
                  <Icon name="expand" size={18} />
                  {t.project.fullscreen}
                </AppLink>
              </div>
            </div>
            <TourPlayer key={tour.id} tour={tour} fullscreenHref={`/${locale}/projects/${project.slug}/tour/`} />
          </div>
        </section>
      )}

      {project.units.length > 0 && (
        <section id="appartamenti" className="scroll-mt-32">
          <div className="wrap grid gap-8 py-14">
            <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">{t.project.units}</h2>
            <Units project={project} />
          </div>
        </section>
      )}

      <section id="posizione" className="scroll-mt-32 border-t border-line bg-board-2">
        <div className="wrap grid gap-8 py-14 lg:grid-cols-[1fr_2fr] lg:gap-12">
          <div className="grid content-start gap-4">
            <h2 className="display text-[clamp(1.9rem,3.6vw,2.8rem)]">{t.project.location}</h2>
            <p className="text-[1.05rem]">
              {location.address}
              <br />
              {location.district}, {location.city}
            </p>
            {location.approximate && <p className="text-[0.9rem] text-mute">{t.project.approximate}</p>}
            <a href={osm} target="_blank" rel="noreferrer" className="btn btn-line w-fit">
              <Icon name="external" size={18} />
              {t.project.openMap}
            </a>

            <div className="mt-6 grid gap-2 border-t border-line pt-6 text-[0.88rem] text-mute">
              <h3 className="label text-ink-2">{t.project.sources}</h3>
              {project.note && <p>{tr(project.note, locale)}</p>}
              {project.sources.map((s) => (
                <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="w-fit text-ink underline underline-offset-4 hover:text-ink-2">
                  {s.label}
                </a>
              ))}
            </div>
          </div>
          <div className="min-w-0">{map}</div>
        </div>
      </section>

      <ContactSection defaultProject={project.slug} />
    </>
  );
}
