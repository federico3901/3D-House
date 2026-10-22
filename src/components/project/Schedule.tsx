"use client";

import { useEffect, useState } from "react";
import { Bar } from "@/components/ui/Status";
import { monthYear, tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { overallProgress, phaseState } from "@/lib/progress";
import type { Project } from "@/lib/types";

const monthIndex = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + (m - 1);
};

/** Overall progress and the cronoprogramma: one row per phase, bars placed on the months they span. */
export function Schedule({ project }: { project: Project }) {
  const { locale, t } = useLocale();
  const pct = overallProgress(project);
  const first = Math.min(monthIndex(project.start), ...project.phases.map((p) => monthIndex(p.start)));
  const last = Math.max(monthIndex(project.delivery), ...project.phases.map((p) => monthIndex(p.end)));
  const span = last - first + 1;
  const months = Array.from({ length: span }, (_, i) => first + i);

  // "Today" on the chart is placed after hydration, from the visitor's clock.
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => {
    const d = new Date();
    const pos = d.getFullYear() * 12 + d.getMonth() + (d.getDate() - 1) / 30 - first;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor's date is only known in the browser
    setToday(pos >= 0 && pos <= span ? pos : null);
  }, [first, span]);

  const stateLabel = { done: t.project.phaseDone, active: t.project.phaseActive, next: t.project.phaseNext };
  const stateTone = { done: "text-ink", active: "text-warn", next: "text-mute" };

  return (
    <div className="grid gap-8">
      <div className="grid gap-6 rounded-[var(--radius)] border border-line bg-board p-5 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10 sm:p-7">
        <p className="display text-[clamp(3.5rem,9vw,6rem)] leading-none">
          {pct}
          <span className="text-[0.45em]">%</span>
        </p>
        <div className="grid gap-3">
          <p className="label text-mute">{t.project.overall}</p>
          <Bar value={pct} state={pct >= 100 ? "done" : "active"} label={t.project.overall} />
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-[0.92rem] text-mute">
            <span>
              {t.project.started}: <strong className="font-semibold text-ink">{monthYear(project.start, locale)}</strong>
            </span>
            <span>
              {project.status === "completed" ? t.project.delivered : t.project.delivery}:{" "}
              <strong className="font-semibold text-ink">{monthYear(project.delivery, locale)}</strong>
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-board">
        <div className="min-w-[640px]">
          {/* Month axis */}
          <div className="grid grid-cols-[minmax(13rem,32%)_1fr] border-b border-line bg-board-2">
            <div className="label px-4 py-2 text-mute">{t.project.phases}</div>
            <div className="relative h-full">
              {months.map((m, i) => {
                const month = m % 12;
                const show = span <= 14 || month % 3 === 0;
                return (
                  <span
                    key={m}
                    className="num absolute top-0 flex h-full items-center border-l border-line pl-1 text-[0.68rem] uppercase text-mute"
                    style={{ left: `${(i / span) * 100}%` }}
                  >
                    {show ? `${t.months[month].slice(0, 3)}${month === 0 || i === 0 ? ` ${String(Math.floor(m / 12)).slice(2)}` : ""}` : ""}
                  </span>
                );
              })}
              {today !== null && (
                <span
                  className="label absolute top-1/2 z-10 -translate-y-1/2 rounded-r-[2px] bg-ink px-1.5 py-0.5 text-[0.62rem] text-board"
                  style={{ left: `${(today / span) * 100}%` }}
                >
                  {t.project.today}
                </span>
              )}
            </div>
          </div>

          {project.phases.map((ph) => {
            const state = phaseState(ph);
            const left = ((monthIndex(ph.start) - first) / span) * 100;
            const width = ((monthIndex(ph.end) - monthIndex(ph.start) + 1) / span) * 100;
            return (
              <div key={ph.id} className="grid grid-cols-[minmax(13rem,32%)_1fr] border-b border-line last:border-b-0">
                <div className="grid gap-0.5 px-4 py-3">
                  <p className="text-[0.95rem] font-semibold leading-snug">{tr(ph.name, locale)}</p>
                  <p className="flex items-center gap-2 text-[0.8rem]">
                    <span className={`font-semibold ${stateTone[state]}`}>{stateLabel[state]}</span>
                    <span className="num text-mute">{ph.progress}%</span>
                  </p>
                </div>
                <div className="relative">
                  {months.map((m, i) => (
                    <span key={m} className="absolute inset-y-0 border-l border-line/60" style={{ left: `${(i / span) * 100}%` }} />
                  ))}
                  {today !== null && <span className="absolute inset-y-0 z-10 border-l-2 border-ink" style={{ left: `${(today / span) * 100}%` }} />}
                  <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${monthYear(ph.start, locale)} – ${monthYear(ph.end, locale)}`}
                  >
                    <div
                      className={`relative h-5 overflow-hidden rounded-[3px] border ${state === "next" ? "border-dashed border-line-strong bg-board-2" : "border-ink/20 bg-line"}`}
                    >
                      <div className={`bar absolute inset-0 h-full rounded-none bg-transparent ${state === "active" ? "is-active" : state === "done" ? "is-done" : ""}`}>
                        {ph.progress > 0 && <span style={{ width: `${ph.progress}%` }} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      </div>
    </div>
  );
}
