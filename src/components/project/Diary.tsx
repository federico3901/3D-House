"use client";

import { Img } from "@/components/ui/Img";
import { longDate, shortDate, tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import type { Project } from "@/lib/types";

/** Site diary: dated entries, newest first, on a vertical rule like the pages of a giornale dei lavori. */
export function Diary({ project }: { project: Project }) {
  const { locale } = useLocale();
  const entries = [...project.updates].sort((a, b) => b.date.localeCompare(a.date));
  const phaseName = (id?: string) => tr(project.phases.find((p) => p.id === id)?.name, locale);

  return (
    <ol className="relative grid gap-8 border-l border-line-strong pl-6 sm:pl-10">
      {entries.map((u, i) => (
        <li key={u.id} className="relative grid gap-4 md:grid-cols-[1fr_minmax(0,18rem)] md:gap-8">
          <span
            className={`absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-ink sm:-left-[47px] ${i === 0 ? "bg-brand" : "bg-board"}`}
            aria-hidden="true"
          />
          <div className="grid content-start gap-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <time dateTime={u.date} className="num text-[0.95rem] font-semibold" title={longDate(u.date, locale)}>
                {shortDate(u.date)}
              </time>
              {u.phaseId && (
                <span className="label rounded-[3px] border border-line-strong px-1.5 py-0.5 text-[0.62rem] text-ink-2">{phaseName(u.phaseId)}</span>
              )}
            </p>
            <h3 className="heading text-xl">{tr(u.title, locale)}</h3>
            <p className="max-w-[60ch] text-ink-2">{tr(u.body, locale)}</p>
          </div>
          {u.image && (
            <Img
              src={u.image}
              alt={tr(u.title, locale)}
              sizes="(min-width: 768px) 288px, 100vw"
              className="aspect-[3/2] w-full rounded-[var(--radius)] object-cover"
            />
          )}
        </li>
      ))}
    </ol>
  );
}
