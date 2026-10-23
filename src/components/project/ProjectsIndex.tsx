"use client";

import { useState } from "react";
import { AppLink } from "@/components/ui/AppLink";
import { Icon } from "@/components/ui/Icon";
import { Img } from "@/components/ui/Img";
import { Bar, ProjectStatusChip } from "@/components/ui/Status";
import { monthYear, tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { overallProgress } from "@/lib/progress";
import { useTenant } from "@/lib/store";
import type { Project, ProjectStatus } from "@/lib/types";

export function ProjectsIndex() {
  const { projects } = useTenant();
  const { t } = useLocale();
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const shown = projects.filter((p) => filter === "all" || p.status === filter);
  const options: { id: ProjectStatus | "all"; label: string }[] = [
    { id: "all", label: t.projects.all },
    { id: "construction", label: t.status.construction },
    { id: "completed", label: t.status.completed },
  ];

  return (
    <section className="wrap grid gap-10 pb-20 pt-10">
      <div className="rise grid gap-4">
        <h1 className="display text-[clamp(2.6rem,6vw,4.6rem)]">{t.projects.title}</h1>
        <p className="lead">{t.projects.lead}</p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t.projects.title}>
        {options.map((o) => {
          const count = o.id === "all" ? projects.length : projects.filter((p) => p.status === o.id).length;
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={filter === o.id}
              onClick={() => setFilter(o.id)}
              className="btn btn-line min-h-10 py-2 aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-board"
            >
              {o.label} <span className="num opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="text-mute">{t.projects.none}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {shown.map((p) => (
            <ProjectCard key={p.slug} project={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const { locale, t } = useLocale();
  const pct = overallProgress(project);
  const free = project.units.filter((u) => u.status === "available").length;
  return (
    <AppLink
      href={`/${locale}/projects/${project.slug}/`}
      className="group grid overflow-hidden rounded-[var(--radius)] border border-line bg-board transition hover:border-ink"
    >
      <div className="relative overflow-hidden bg-night">
        <Img
          src={project.cover.src}
          alt={tr(project.cover.alt, locale)}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <span className="absolute left-4 top-4">
          <ProjectStatusChip status={project.status} />
        </span>
        {project.tours.length > 0 && (
          <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[0.8rem] font-semibold text-white backdrop-blur-md">
            <Icon name="pano" size={16} />
            {t.projects.tour}
          </span>
        )}
      </div>
      <div className="grid gap-4 p-5 sm:p-6">
        <div className="grid gap-1">
          <h2 className="heading text-2xl">
            {project.name} <span className="text-mute">· {tr(project.subtitle, locale)}</span>
          </h2>
          <p className="flex items-center gap-1.5 text-[0.9rem] text-mute">
            <Icon name="pin" size={15} />
            {project.location.district}, {project.location.city}
          </p>
        </div>
        {project.status === "construction" ? (
          <div className="grid gap-2">
            <div className="flex items-baseline justify-between text-[0.9rem]">
              <span className="text-mute">
                {t.project.delivery}: <span className="text-ink">{monthYear(project.delivery, locale)}</span>
              </span>
              <span className="num font-semibold">{pct}%</span>
            </div>
            <Bar value={pct} state="active" label={t.project.overall} />
          </div>
        ) : (
          <p className="text-[0.9rem] text-mute">
            {t.project.delivered}: <span className="text-ink">{monthYear(project.delivery, locale)}</span>
          </p>
        )}
        <div className="flex items-center justify-between border-t border-line pt-4 text-[0.9rem]">
          <span className="text-ink-2">
            <span className="num">{project.units.length}</span> {t.projects.units}
            {free > 0 && (
              <>
                {" · "}
                <span className="font-semibold text-ok">
                  <span className="num">{free}</span> {t.projects.available}
                </span>
              </>
            )}
          </span>
          <span className="flex items-center gap-1 font-semibold">
            {t.projects.open}
            <Icon name="arrow" size={16} className="transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </AppLink>
  );
}
