"use client";

import { useState } from "react";
import { AppLink } from "@/components/ui/AppLink";
import { Icon } from "@/components/ui/Icon";
import { tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { useProject } from "@/lib/store";
import { TourPlayer } from "./TourPlayer";

/** Full-screen tour of a project, with a slim bar to go back and to switch tour. */
export function TourPage({ slug }: { slug: string }) {
  const project = useProject(slug);
  const { locale, t } = useLocale();
  const [idx, setIdx] = useState(0);
  if (!project || project.tours.length === 0) return null;
  const tour = project.tours[Math.min(idx, project.tours.length - 1)];

  return (
    <div className="on-night fixed inset-0 grid grid-rows-[auto_1fr] bg-night text-night-ink">
      <div
        className="flex items-center justify-between gap-3 border-b border-night-line px-3 py-2 sm:px-5"
        style={{ paddingTop: "max(0.5rem, env(safe-area-inset-top))", paddingLeft: "max(0.75rem, env(safe-area-inset-left))", paddingRight: "max(0.75rem, env(safe-area-inset-right))" }}
      >
        <AppLink href={`/${locale}/projects/${project.slug}/#tour`} className="btn btn-ghost-night min-h-10 py-2 text-[0.9rem]">
          <Icon name="back" size={18} />
          <span className="hidden sm:inline">{t.tour.back}</span>
        </AppLink>
        <p className="heading min-w-0 truncate text-center text-[1.05rem]">
          {project.name} <span className="text-night-mute">· {tr(project.subtitle, locale)}</span>
        </p>
        <div className="flex gap-1">
          {project.tours.length > 1
            ? project.tours.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  aria-pressed={i === idx}
                  onClick={() => setIdx(i)}
                  className="btn btn-ghost-night min-h-10 px-3 py-2 text-[0.85rem] aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-brand-ink"
                >
                  {tr(x.title, locale)}
                </button>
              ))
            : <span className="w-10" />}
        </div>
      </div>
      <div className="min-h-0">
        <TourPlayer key={tour.id} tour={tour} page />
      </div>
    </div>
  );
}
