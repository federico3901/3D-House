"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { useTenant } from "@/lib/store";
import { italyOffset } from "@/lib/sun";
import type { Project, VisitHours } from "@/lib/types";

/* Booking a visit: on site, at the office or by video call, on one of the builder's days and times (brand.visits)
   in the next two weeks. The confirmation offers the appointment as a calendar file (.ics). */

export const DEFAULT_HOURS: VisitHours = { days: [1, 2, 3, 4, 5, 6], slots: ["09:30", "11:00", "14:30", "16:00", "17:30"], minutes: 60 };
const HORIZON = 14;
type Kind = "site" | "office" | "video";

/** Opens the booking form on a project, from anywhere on the page. */
export function bookVisit(project: string) {
  window.dispatchEvent(new CustomEvent("cl:visit", { detail: { project } }));
  document.getElementById("contatti")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** The bookable days from tomorrow, as "YYYY-MM-DD" with their weekday (0 = Sunday). */
export function bookableDays(from: Date, hours: VisitHours): { ymd: string; weekday: number; day: number; month: number }[] {
  const out = [];
  for (let i = 1; i <= HORIZON; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    if (!hours.days.includes(d.getDay())) continue;
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ ymd, weekday: d.getDay(), day: d.getDate(), month: d.getMonth() });
  }
  return out;
}

/** A calendar file for the appointment, times in UTC from Italian clock time. */
export function icsFile(o: { ymd: string; time: string; minutes: number; summary: string; location: string; description: string; uid: string }): string {
  const [y, m, d] = o.ymd.split("-").map(Number);
  const [hh, mm] = o.time.split(":").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, hh - italyOffset(y, m, d), mm));
  const end = new Date(start.getTime() + o.minutes * 60000);
  const stamp = (x: Date) =>
    x
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cantiere Live//Visite//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${o.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(o.summary)}`,
    `LOCATION:${esc(o.location)}`,
    `DESCRIPTION:${esc(o.description)}`,
    "STATUS:TENTATIVE",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function VisitBooking({ project, setProject, days }: { project: string; setProject: (p: string) => void; days: ReturnType<typeof bookableDays> }) {
  const { brand, projects } = useTenant();
  const { locale, t } = useLocale();
  const v = t.visit;
  const hours = brand.visits ?? DEFAULT_HOURS;
  const chosen: Project | undefined = projects.find((p) => p.slug === project);
  const kinds: Kind[] = chosen?.status === "construction" ? ["site", "office", "video"] : ["office", "video"];
  const [kindPick, setKind] = useState<Kind>("site");
  const kind = kinds.includes(kindPick) ? kindPick : kinds[0];
  const [day, setDay] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "error" | "sent">("idle");
  const [ics, setIcs] = useState<string | null>(null);

  const dayInfo = days.find((d) => d.ymd === day);
  // Saturday: mornings only.
  const slots = dayInfo ? hours.slots.filter((s) => dayInfo.weekday !== 6 || s < "13:00") : [];
  const label = (d: (typeof days)[number]) => `${v.weekdays[d.weekday]} ${d.day} ${t.months[d.month].slice(0, 3)}`;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!day || !time || !slots.includes(time) || !String(f.get("name")).trim() || !String(f.get("email")).includes("@") || !f.get("consent")) {
      setState("error");
      return;
    }
    const what = chosen ? `${chosen.name} · ${tr(chosen.subtitle, locale)}` : brand.name;
    const location = kind === "site" && chosen ? `${chosen.location.address}, ${chosen.location.city}` : kind === "office" ? brand.address : v.kinds.video;
    const file = icsFile({
      ymd: day,
      time,
      minutes: hours.minutes,
      summary: `${v.summary(what)} (${v.kinds[kind]})`,
      location,
      description: `${brand.name} · ${brand.phone} · ${brand.email}`,
      uid: `${day}-${time.replace(":", "")}-${project || "office"}@cantiere-live`,
    });
    setIcs(URL.createObjectURL(new Blob([file], { type: "text/calendar" })));
    setState("sent");
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 rounded-[var(--radius)] border border-line bg-board-2 p-5 sm:grid-cols-2 sm:p-7">
      <label className="field sm:col-span-2">
        <span>{t.contact.interest}</span>
        <select id="visit-project" name="project" className="input" value={project} onChange={(e) => setProject(e.target.value)}>
          <option value="">{t.contact.interestNone}</option>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name} · {tr(p.subtitle, locale)}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="mb-1.5 text-[0.85rem] font-semibold text-ink-2">{v.kind}</legend>
        <div className="flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`min-h-10 rounded-[var(--radius)] border px-4 text-[0.92rem] font-semibold ${kind === k ? "border-ink bg-ink text-board" : "border-line-strong bg-board hover:border-ink"}`}
            >
              {v.kinds[k]}
            </button>
          ))}
        </div>
        <p className="text-[0.84rem] text-mute">{v.kindHelp[kind]}</p>
      </fieldset>

      <fieldset className="grid gap-2 sm:col-span-2">
        <legend className="mb-1.5 text-[0.85rem] font-semibold text-ink-2">{v.day}</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.map((d) => (
            <button
              key={d.ymd}
              type="button"
              aria-pressed={day === d.ymd}
              onClick={() => {
                setDay(d.ymd);
                setTime(null);
              }}
              className={`grid min-w-[4.2rem] shrink-0 justify-items-center rounded-[var(--radius)] border px-2 py-2 ${day === d.ymd ? "border-ink bg-ink text-board" : "border-line-strong bg-board hover:border-ink"}`}
            >
              <span className="label">{v.weekdays[d.weekday]}</span>
              <span className="heading text-[1.3rem]">{d.day}</span>
              <span className="text-[0.75rem]">{t.months[d.month].slice(0, 3)}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {dayInfo && (
        <fieldset className="grid gap-2 sm:col-span-2">
          <legend className="mb-1.5 text-[0.85rem] font-semibold text-ink-2">{v.time}</legend>
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={time === s}
                onClick={() => setTime(s)}
                className={`num min-h-10 rounded-[var(--radius)] border px-4 text-[0.95rem] font-semibold ${time === s ? "border-brand bg-brand text-brand-ink" : "border-line-strong bg-board hover:border-ink"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <label className="field">
        <span>{t.contact.name}</span>
        <input id="visit-name" name="name" className="input" autoComplete="name" required />
      </label>
      <label className="field">
        <span>{t.contact.email}</span>
        <input id="visit-email" name="email" type="email" className="input" autoComplete="email" required />
      </label>
      <label className="field sm:col-span-2">
        <span>{t.contact.phone}</span>
        <input id="visit-phone" name="phone" type="tel" className="input" autoComplete="tel" />
      </label>
      <label className="flex items-start gap-3 text-[0.9rem] text-ink-2 sm:col-span-2">
        <input id="visit-consent" name="consent" type="checkbox" className="mt-1 h-4 w-4 accent-[var(--ink)]" />
        {t.contact.consent}
      </label>

      <div className="grid gap-3 sm:col-span-2">
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-ink">
            <Icon name="calendar" size={18} />
            {v.confirm}
          </button>
          <p className="text-[0.9rem] text-ink-2">{day && time && dayInfo ? `${label(dayInfo)} · ${time} · ${v.kinds[kind]}` : v.pick}</p>
        </div>
        <p role="status" className="text-[0.9rem]">
          {state === "error" && <span className="text-warn">{v.required}</span>}
          {state === "sent" && (
            <span className="flex flex-wrap items-start gap-x-3 gap-y-2 text-ok">
              <Icon name="check" size={18} className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1">
                <strong>{v.sent}</strong> <span className="text-ink-2">{v.sentDemo}</span>
              </span>
              {ics && (
                <a href={ics} download="visita.ics" className="btn btn-line min-h-9 py-1.5 text-[0.88rem] text-ink">
                  <Icon name="calendar" size={16} />
                  {v.calendar}
                </a>
              )}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
