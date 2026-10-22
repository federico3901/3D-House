"use client";

import { AppLink } from "@/components/ui/AppLink";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Img } from "@/components/ui/Img";
import { Bar, ProjectStatusChip } from "@/components/ui/Status";
import { longDate, monthYear, tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { currentPhase, latestUpdate, overallProgress, phaseState } from "@/lib/progress";
import { useTenant } from "@/lib/store";
import type { Project } from "@/lib/types";
import { ContactSection } from "./ContactSection";

export function HomeView() {
  const { brand, projects } = useTenant();
  const { locale, t } = useLocale();
  const live = projects.filter((p) => p.status === "construction");
  const done = projects.filter((p) => p.status === "completed");
  const featured = live[0];
  const delivered = done.reduce((n, p) => n + p.units.length, 0);
  const available = projects.reduce((n, p) => n + p.units.filter((u) => u.status === "available").length, 0);

  return (
    <>
      {/* Hero */}
      <section className="wrap grid items-center gap-10 pb-16 pt-10 md:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24">
        <div className="rise grid gap-7">
          <p className="label flex items-center gap-2 text-mute">
            <span className="h-px w-8 bg-ink" />
            {t.home.eyebrow} · {brand.city}
          </p>
          <h1 className="display text-[clamp(2.6rem,6vw,5rem)]">{t.home.title.replace("{city}", brand.city)}</h1>
          <p className="lead">{tr(brand.tagline, locale)}</p>
          <div className="flex flex-wrap gap-3">
            {featured && (
              <AppLink href={`/${locale}/projects/${featured.slug}/`} className="btn btn-brand">
                {t.home.ctaFollow}
                <Icon name="arrow" size={18} />
              </AppLink>
            )}
            <AppLink href={`/${locale}/projects/`} className="btn btn-line">
              {t.home.ctaProjects}
            </AppLink>
          </div>
          <dl className="mt-2 grid max-w-xl grid-cols-3 border-t border-line pt-5">
            <Stat value={String(delivered)} label={t.home.unitsDelivered} />
            <Stat value={String(live.length)} label={t.home.sitesOpen} />
            <Stat value={String(available)} label={t.home.unitsAvailable} />
          </dl>
        </div>

        <div className="rise rise-2 relative">
          <div className="overflow-hidden rounded-[var(--radius)] bg-night">
            <Img
              src="/media/hero-gru.jpg"
              alt=""
              priority
              className="aspect-[4/3] w-full object-cover lg:aspect-[5/6]"
            />
          </div>
          {featured && <LiveCard project={featured} />}
        </div>
      </section>

      {/* Under construction */}
      {live.length > 0 && (
        <section id="cantieri" className="scroll-mt-20 border-t border-line bg-board">
          <div className="wrap grid gap-10 py-16 lg:py-24">
            <SectionHead title={t.home.constructionTitle} lead={t.home.constructionLead} />
            {live.map((p) => (
              <ConstructionFeature key={p.slug} project={p} />
            ))}
          </div>
        </section>
      )}

      {/* How we show the work */}
      <section className="on-night bg-night text-night-ink">
        <div className="wrap grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <h2 className="display text-[clamp(2rem,4vw,3.25rem)]">{t.home.howTitle}</h2>
          <ul className="grid gap-px overflow-hidden rounded-[var(--radius)] bg-night-line sm:grid-cols-3">
            {t.home.how.map((item, i) => (
              <li key={item.title} className="grid content-start gap-3 bg-night-2 p-6">
                <span className="grid h-10 w-10 place-items-center rounded-[3px] bg-brand text-brand-ink">
                  <Icon name={(["progress", "diary", "pano"] as IconName[])[i]} />
                </span>
                <h3 className="heading text-lg">{item.title}</h3>
                <p className="text-[0.95rem] text-night-mute">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Completed */}
      {done.length > 0 && (
        <section id="realizzati" className="scroll-mt-20">
          <div className="wrap grid gap-10 py-16 lg:py-24">
            <SectionHead title={t.home.completedTitle} lead={t.home.completedLead} />
            {done.map((p) => (
              <CompletedFeature key={p.slug} project={p} />
            ))}
          </div>
        </section>
      )}

      <ContactSection />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="grid gap-0.5 pr-3">
      <dt className="order-2 text-[0.8rem] leading-snug text-mute">{label}</dt>
      <dd className="display order-1 text-[2rem]">{value}</dd>
    </div>
  );
}

function SectionHead({ title, lead }: { title: string; lead: string }) {
  return (
    <div className="grid gap-3 md:grid-cols-[1fr_1fr] md:items-end">
      <h2 className="display text-[clamp(2rem,4.2vw,3.4rem)]">{title}</h2>
      <p className="lead md:justify-self-end">{lead}</p>
    </div>
  );
}

/** The card over the hero photo: the open site, its progress and the latest note from it. */
function LiveCard({ project }: { project: Project }) {
  const { locale, t } = useLocale();
  const pct = overallProgress(project);
  const phase = currentPhase(project);
  const update = latestUpdate(project);
  return (
    <AppLink
      href={`/${locale}/projects/${project.slug}/`}
      className="rise rise-3 group relative -mt-24 ml-4 mr-4 grid gap-4 rounded-[var(--radius)] border border-line bg-board p-5 shadow-[0_24px_60px_-28px_rgba(18,21,20,0.55)] transition hover:border-ink sm:ml-8 sm:mr-auto sm:max-w-[25rem] lg:absolute lg:-left-10 lg:bottom-10 lg:m-0"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="label flex items-center gap-2 text-ink">
          <span className="pulse" />
          {t.home.live}
        </span>
        {update && <span className="text-[0.78rem] text-mute">{t.home.updated} {longDate(update.date, locale)}</span>}
      </div>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="heading truncate text-xl">{project.name}</p>
          <p className="text-[0.9rem] text-mute">{tr(project.subtitle, locale)}</p>
        </div>
        <p className="display text-[2.6rem] leading-none">
          {pct}
          <span className="text-[1.3rem]">%</span>
        </p>
      </div>
      <Bar value={pct} state="active" label={t.project.overall} />
      <div className="grid gap-1 border-t border-line pt-3 text-[0.9rem]">
        {phase && (
          <p>
            <span className="label mr-2 text-mute">{t.home.next}</span>
            {tr(phase.name, locale)}
          </p>
        )}
        {update && <p className="line-clamp-2 text-ink-2">«{tr(update.title, locale)}»</p>}
      </div>
      <span className="flex items-center gap-1.5 text-[0.9rem] font-semibold">
        {t.home.ctaFollow}
        <Icon name="arrow" size={16} className="transition group-hover:translate-x-1" />
      </span>
    </AppLink>
  );
}

function ConstructionFeature({ project }: { project: Project }) {
  const { locale, t } = useLocale();
  const pct = overallProgress(project);
  const free = project.units.filter((u) => u.status === "available").length;
  return (
    <article className="grid overflow-hidden rounded-[var(--radius)] border border-line bg-board-2 lg:grid-cols-[1.1fr_1fr]">
      <AppLink href={`/${locale}/projects/${project.slug}/`} className="group relative block overflow-hidden bg-night lg:min-h-[22rem]">
        {/* From lg up the photo fills the row, whose height the text sets */}
        <Img
          src={project.cover.src}
          alt={tr(project.cover.alt, locale)}
          className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03] lg:absolute lg:inset-0 lg:aspect-auto lg:h-full"
        />
        <span className="absolute left-4 top-4">
          <ProjectStatusChip status={project.status} />
        </span>
      </AppLink>
      <div className="grid content-start gap-6 p-6 sm:p-8">
        <div className="grid gap-2">
          <h3 className="display text-[clamp(1.9rem,3.2vw,2.6rem)]">{project.name}</h3>
          <p className="heading text-lg text-ink-2">{tr(project.subtitle, locale)}</p>
          <p className="flex items-center gap-1.5 text-[0.92rem] text-mute">
            <Icon name="pin" size={16} />
            {project.location.address}, {project.location.district}, {project.location.city}
          </p>
        </div>
        <p className="text-ink-2">{tr(project.summary, locale)}</p>

        <div className="grid gap-3">
          <div className="flex items-baseline justify-between">
            <span className="label text-mute">{t.project.overall}</span>
            <span className="num text-xl font-semibold">{pct}%</span>
          </div>
          {/* One segment per phase, sized by its weight */}
          <div className="flex gap-1" aria-hidden="true">
            {project.phases.map((ph) => (
              <div key={ph.id} style={{ flexGrow: ph.weight }} className="basis-0">
                <Bar value={ph.progress} state={phaseState(ph)} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[0.85rem] text-mute">
            <span>
              {t.project.started} <span className="text-ink">{monthYear(project.start, locale)}</span>
            </span>
            <span>
              {t.project.delivery} <span className="text-ink">{monthYear(project.delivery, locale)}</span>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AppLink href={`/${locale}/projects/${project.slug}/`} className="btn btn-ink">
            {t.home.ctaFollow}
            <Icon name="arrow" size={18} />
          </AppLink>
          {project.tours.length > 0 && (
            <AppLink href={`/${locale}/projects/${project.slug}/tour/`} className="btn btn-line">
              <Icon name="pano" />
              {t.projects.tour}
            </AppLink>
          )}
          {free > 0 && (
            <span className="text-[0.9rem] text-ok">
              <strong className="num">{free}</strong> {t.projects.units} {t.projects.available}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function CompletedFeature({ project }: { project: Project }) {
  const { locale, t } = useLocale();
  const tourScene = project.tours.find((x) => x.kind === "panorama");
  const thumbs = tourScene?.kind === "panorama" ? tourScene.scenes : [];
  return (
    <article className="grid gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
      <div className="grid content-start gap-5 lg:order-2">
        <div className="flex flex-wrap items-center gap-3">
          <ProjectStatusChip status={project.status} />
          <span className="text-[0.9rem] text-mute">
            {t.project.delivered}: <span className="text-ink">{monthYear(project.delivery, locale)}</span>
          </span>
        </div>
        <h3 className="display text-[clamp(1.9rem,3.2vw,2.6rem)]">
          {project.name} <span className="text-mute">· {tr(project.subtitle, locale)}</span>
        </h3>
        <p className="text-ink-2">{tr(project.summary, locale)}</p>
        <dl className="sheet text-[0.92rem]">
          {project.facts.slice(0, 4).map((f) => (
            <div key={f.label.it} className="sheet-row">
              <dt className="text-mute">{tr(f.label, locale)}</dt>
              <dd>{tr(f.value, locale)}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-3">
          {project.tours.length > 0 && (
            <AppLink href={`/${locale}/projects/${project.slug}/tour/`} className="btn btn-brand">
              <Icon name="pano" />
              {t.projects.tour}
            </AppLink>
          )}
          <AppLink href={`/${locale}/projects/${project.slug}/`} className="btn btn-line">
            {t.projects.open}
          </AppLink>
        </div>
      </div>
      <AppLink href={`/${locale}/projects/${project.slug}/tour/`} className="group relative block overflow-hidden rounded-[var(--radius)] bg-night lg:order-1">
        <Img src={project.gallery[0]?.src ?? project.cover.src} alt={tr(project.gallery[0]?.alt ?? project.cover.alt, locale)} className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        <span className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-white">
          <span className="flex -space-x-2">
            {thumbs.slice(0, 3).map((s) => (
              <Img key={s.id} src={s.thumb} alt="" className="h-11 w-11 rounded-full border-2 border-white object-cover" />
            ))}
          </span>
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[0.88rem] font-semibold backdrop-blur-md">
            <Icon name="pano" size={18} />
            {t.projects.tour}
          </span>
        </span>
      </AppLink>
    </article>
  );
}
