"use client";

import { useRef, useState } from "react";
import { DEFAULT_HOURS } from "@/components/home/VisitBooking";
import { AppLink } from "@/components/ui/AppLink";
import { Icon } from "@/components/ui/Icon";
import { Img } from "@/components/ui/Img";
import { Bar, ProjectStatusChip, UnitStatusChip } from "@/components/ui/Status";
import { floorLabel, formatNumber, inkOn, longDate, tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { clamp, overallProgress, phaseState } from "@/lib/progress";
import { resetTenant, saveTenant, useTenant } from "@/lib/store";
import type { Project, ProjectStatus, TenantData, UnitStatus } from "@/lib/types";

type Tab = "progress" | "diary" | "units" | "info";
const SWATCHES = ["#F2B200", "#E4572E", "#1F6FEB", "#127A5B", "#7A3FD1", "#121514"];

/** The builder's panel. Every change is saved at once and shows on the public pages (also in other open tabs). */
export function AdminApp() {
  const data = useTenant();
  const { locale, t } = useLocale();
  // Open on the site under construction, if there is one.
  const [selected, setSelected] = useState<string>(
    () => (data.projects.find((p) => p.status === "construction") ?? data.projects[0])?.slug ?? "brand",
  );
  const [tab, setTab] = useState<Tab>("progress");
  const [flash, setFlash] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [jsonFallback, setJsonFallback] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  const say = (text: string, tone: "ok" | "warn" = "ok") => {
    window.clearTimeout(flashTimer.current);
    setFlash({ text, tone });
    flashTimer.current = window.setTimeout(() => setFlash(null), 2600);
  };

  const update = (change: (draft: TenantData) => void, message: string = t.admin.saved) => {
    const next = structuredClone(data);
    change(next);
    if (saveTenant(next)) say(message);
    else say(t.admin.storageFailed, "warn");
  };
  const updateProject = (slug: string, change: (p: Project) => void, message?: string) =>
    update((d) => {
      const p = d.projects.find((x) => x.slug === slug);
      if (p) change(p);
    }, message);

  const copyJson = async () => {
    const json = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setJsonFallback(null);
      say(t.admin.copied);
    } catch {
      setJsonFallback(json);
      say(t.admin.copyFailed, "warn");
    }
  };

  const project = data.projects.find((p) => p.slug === selected);

  return (
    <section className="wrap grid gap-8 pb-20 pt-10">
      <header className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid gap-3">
          <p className="label flex items-center gap-2 text-mute">
            <span className="h-px w-8 bg-ink" />
            {data.brand.name}
          </p>
          <h1 className="display text-[clamp(2.4rem,5vw,4rem)]">{t.admin.title}</h1>
          <p className="lead">{t.admin.lead}</p>
          <p className="max-w-[70ch] rounded-[var(--radius)] border border-dashed border-line-strong bg-board-2 px-3 py-2 text-[0.88rem] text-ink-2">
            {t.admin.demoStorage}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AppLink href={project ? `/${locale}/projects/${project.slug}/` : `/${locale}/`} className="btn btn-ink">
            <Icon name="eye" size={18} />
            {t.admin.viewSite}
          </AppLink>
          <button type="button" className="btn btn-line" onClick={copyJson}>
            <Icon name="copy" size={18} />
            {t.admin.exportJson}
          </button>
          {confirmReset ? (
            <span className="flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-warn bg-warn-bg px-3 py-2 text-[0.88rem]">
              {t.admin.resetConfirm}
              <button
                type="button"
                className="btn btn-ink min-h-9 py-1.5"
                onClick={() => {
                  resetTenant();
                  setConfirmReset(false);
                  say(t.admin.resetDone);
                }}
              >
                {t.admin.resetYes}
              </button>
              <button type="button" className="btn btn-line min-h-9 py-1.5" onClick={() => setConfirmReset(false)}>
                {t.admin.cancel}
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-line" onClick={() => setConfirmReset(true)}>
              <Icon name="reset" size={18} />
              {t.admin.reset}
            </button>
          )}
        </div>
      </header>

      {jsonFallback && (
        <textarea id="admin-json" readOnly value={jsonFallback} className="input num h-48 text-[0.75rem]" onFocus={(e) => e.currentTarget.select()} />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[17rem_1fr]">
        {/* Projects and brand */}
        <nav className="grid gap-2 lg:sticky lg:top-24" aria-label={t.admin.project}>
          {data.projects.map((p) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => setSelected(p.slug)}
              aria-current={selected === p.slug ? "true" : undefined}
              className="grid gap-2 rounded-[var(--radius)] border border-line bg-board p-3 text-left transition hover:border-ink-2 aria-[current]:border-ink aria-[current]:shadow-[inset_3px_0_0_var(--brand)]"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="heading text-[1.02rem]">{p.name}</span>
                <span className="num text-[0.85rem] text-mute">{overallProgress(p)}%</span>
              </span>
              <span className="text-[0.85rem] text-mute">{tr(p.subtitle, locale)}</span>
              <Bar value={overallProgress(p)} state={p.status === "completed" ? "done" : "active"} />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelected("brand")}
            aria-current={selected === "brand" ? "true" : undefined}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-board p-3 text-left transition hover:border-ink-2 aria-[current]:border-ink aria-[current]:shadow-[inset_3px_0_0_var(--brand)]"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[3px] bg-brand text-[0.8rem] font-bold text-brand-ink">{data.brand.monogram}</span>
            <span className="heading text-[1.02rem]">{t.admin.tabs.brand}</span>
          </button>
        </nav>

        <div className="min-w-0 rounded-[var(--radius)] border border-line bg-board">
          {project ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
                <div className="grid gap-1">
                  <h2 className="heading text-2xl">
                    {project.name} <span className="text-mute">· {tr(project.subtitle, locale)}</span>
                  </h2>
                  <span>
                    <ProjectStatusChip status={project.status} />
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 rounded-[var(--radius)] bg-board-2 p-1" role="tablist">
                  {(["progress", "diary", "units", "info"] as Tab[]).map((x) => (
                    <button
                      key={x}
                      type="button"
                      role="tab"
                      aria-selected={tab === x}
                      onClick={() => setTab(x)}
                      className="rounded-[3px] px-3 py-1.5 text-[0.9rem] font-medium text-ink-2 hover:text-ink aria-selected:bg-ink aria-selected:text-board"
                    >
                      {t.admin.tabs[x]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {tab === "progress" && <ProgressPanel project={project} onChange={(fn) => updateProject(project.slug, fn)} />}
                {tab === "diary" && <DiaryPanel project={project} data={data} onChange={(fn, msg) => updateProject(project.slug, fn, msg)} />}
                {tab === "units" && <UnitsPanel project={project} onChange={(fn) => updateProject(project.slug, fn)} />}
                {tab === "info" && <InfoPanel project={project} onChange={(fn) => updateProject(project.slug, fn)} />}
              </div>
            </>
          ) : (
            <BrandPanel data={data} onChange={(fn) => update(fn)} />
          )}
        </div>
      </div>

      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-4 right-4 z-50 transition ${flash ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"}`}
        style={{ bottom: "max(1rem, env(safe-area-inset-bottom))", right: "max(1rem, env(safe-area-inset-right))" }}
      >
        {flash && (
          <span className={`flex items-center gap-2 rounded-[var(--radius)] px-4 py-3 text-[0.92rem] font-semibold shadow-lg ${flash.tone === "ok" ? "bg-ink text-board" : "bg-warn-bg text-warn"}`}>
            <Icon name={flash.tone === "ok" ? "check" : "close"} size={18} />
            {flash.text}
          </span>
        )}
      </div>
    </section>
  );
}

function ProgressPanel({ project, onChange }: { project: Project; onChange: (fn: (p: Project) => void) => void }) {
  const { locale, t } = useLocale();
  const pct = overallProgress(project);
  const label = { done: t.project.phaseDone, active: t.project.phaseActive, next: t.project.phaseNext };
  return (
    <div className="grid gap-6">
      <div className="grid gap-3 rounded-[var(--radius)] bg-board-2 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-6">
        <p className="display text-5xl leading-none">
          {pct}
          <span className="text-2xl">%</span>
        </p>
        <div className="grid gap-2">
          <p className="label text-mute">{t.admin.overall}</p>
          <Bar value={pct} state={pct >= 100 ? "done" : "active"} />
          <p className="text-[0.85rem] text-mute">{t.admin.phaseHelp}</p>
        </div>
      </div>
      <ul className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line">
        {project.phases.map((ph, i) => (
          <li key={ph.id} className="grid gap-3 bg-board p-4 sm:grid-cols-[1fr_15rem] sm:items-center sm:gap-6">
            <div className="grid gap-0.5">
              <p className="font-semibold">{tr(ph.name, locale)}</p>
              <p className="text-[0.82rem] text-mute">
                {label[phaseState(ph)]} · {t.admin.weight} {ph.weight}%
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                id={`phase-range-${project.slug}-${ph.id}`}
                type="range"
                min={0}
                max={100}
                step={5}
                value={ph.progress}
                aria-label={tr(ph.name, locale)}
                onChange={(e) => onChange((p) => void (p.phases[i].progress = clamp(Number(e.target.value))))}
                className="w-full"
              />
              <input
                id={`phase-num-${project.slug}-${ph.id}`}
                type="number"
                min={0}
                max={100}
                value={ph.progress}
                aria-label={`${tr(ph.name, locale)} %`}
                onChange={(e) => onChange((p) => void (p.phases[i].progress = clamp(Math.round(Number(e.target.value)))))}
                className="input num w-20 min-h-9 px-2 py-1 text-right"
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiaryPanel({
  project,
  data,
  onChange,
}: {
  project: Project;
  data: TenantData;
  onChange: (fn: (p: Project) => void, message?: string) => void;
}) {
  const { locale, t } = useLocale();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ date: today, phaseId: project.phases.find((p) => p.progress < 100)?.id ?? "", titleIt: "", titleEn: "", bodyIt: "", bodyEn: "", image: "" });
  const [error, setError] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Photos already on the site, to pick from.
  const library = [...new Set(data.projects.flatMap((p) => [p.cover.src, ...p.gallery.map((g) => g.src), ...p.updates.flatMap((u) => (u.image ? [u.image] : []))]))];

  const publish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titleIt.trim()) {
      setError(true);
      return;
    }
    setError(false);
    onChange((p) => {
      p.updates.unshift({
        id: `u${Date.now()}`,
        date: form.date || today,
        phaseId: form.phaseId || undefined,
        title: { it: form.titleIt.trim(), en: form.titleEn.trim() || form.titleIt.trim() },
        body: { it: form.bodyIt.trim(), en: form.bodyEn.trim() || form.bodyIt.trim() },
        image: form.image || undefined,
      });
    }, t.admin.published);
    setForm((f) => ({ ...f, titleIt: "", titleEn: "", bodyIt: "", bodyEn: "", image: "" }));
  };

  const updates = [...project.updates].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="grid gap-8 xl:grid-cols-[1.1fr_1fr]">
      <form onSubmit={publish} className="grid content-start gap-4">
        <h3 className="heading text-xl">{t.admin.newUpdate}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>{t.admin.date}</span>
            <input id="diary-date" type="date" className="input" value={form.date} onChange={set("date")} />
          </label>
          <label className="field">
            <span>{t.admin.phase}</span>
            <select id="diary-phase" className="input" value={form.phaseId} onChange={set("phaseId")}>
              <option value="">{t.admin.noPhase}</option>
              {project.phases.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {tr(ph.name, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t.admin.titleIt}</span>
            <input id="diary-title-it" className="input" value={form.titleIt} onChange={set("titleIt")} placeholder="Getto del solaio del primo piano" />
          </label>
          <label className="field">
            <span>{t.admin.titleEn}</span>
            <input id="diary-title-en" className="input" value={form.titleEn} onChange={set("titleEn")} placeholder="First-floor slab poured" />
          </label>
          <label className="field">
            <span>{t.admin.bodyIt}</span>
            <textarea id="diary-body-it" className="input" value={form.bodyIt} onChange={set("bodyIt")} />
          </label>
          <label className="field">
            <span>{t.admin.bodyEn}</span>
            <textarea id="diary-body-en" className="input" value={form.bodyEn} onChange={set("bodyEn")} />
          </label>
        </div>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-[0.85rem] font-semibold text-ink-2">{t.admin.image}</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            <button
              type="button"
              aria-pressed={form.image === ""}
              onClick={() => setForm((f) => ({ ...f, image: "" }))}
              className="grid aspect-square place-items-center rounded-[3px] border border-dashed border-line-strong p-1 text-center text-[0.7rem] text-mute aria-pressed:border-2 aria-pressed:border-ink"
            >
              {t.admin.noImage}
            </button>
            {library.map((src) => (
              <button
                key={src}
                type="button"
                aria-pressed={form.image === src}
                onClick={() => setForm((f) => ({ ...f, image: src }))}
                className="overflow-hidden rounded-[3px] border-2 border-transparent aria-pressed:border-ink aria-pressed:ring-2 aria-pressed:ring-brand"
              >
                <Img src={src} alt="" sizes="120px" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className="btn btn-brand">
            <Icon name="plus" size={18} />
            {t.admin.publish}
          </button>
          {error && <span className="text-[0.9rem] text-warn">{t.admin.needTitle}</span>}
        </div>
      </form>

      <div className="grid content-start gap-3">
        <h3 className="heading text-xl">{t.admin.updates}</h3>
        <ul className="grid gap-2">
          {updates.map((u) => (
            <li key={u.id} className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 rounded-[var(--radius)] border border-line p-2">
              {u.image ? <Img src={u.image} alt="" sizes="64px" className="h-12 w-14 rounded-[3px] object-cover" /> : <span className="h-12 w-14 rounded-[3px] bg-board-2" />}
              <span className="min-w-0">
                <span className="block truncate font-semibold">{tr(u.title, locale)}</span>
                <span className="text-[0.8rem] text-mute">{longDate(u.date, locale)}</span>
              </span>
              <button
                type="button"
                onClick={() => onChange((p) => void (p.updates = p.updates.filter((x) => x.id !== u.id)))}
                className="grid h-9 w-9 place-items-center rounded-[3px] text-mute hover:bg-warn-bg hover:text-warn"
                aria-label={`${t.admin.remove}: ${tr(u.title, locale)}`}
                title={t.admin.remove}
              >
                <Icon name="trash" size={18} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UnitsPanel({ project, onChange }: { project: Project; onChange: (fn: (p: Project) => void) => void }) {
  const { locale, t } = useLocale();
  return (
    <ul className="grid gap-px overflow-hidden rounded-[var(--radius)] border border-line bg-line">
      {project.units.map((u, i) => (
        <li key={u.id} className="grid grid-cols-[3rem_1fr] items-center gap-x-4 gap-y-3 bg-board p-3 sm:grid-cols-[3rem_1fr_auto_9rem_11rem]">
          <span className="heading text-xl">{u.name}</span>
          <span className="text-[0.92rem]">
            {t.rooms(u.rooms)} · <span className="num">{u.area} m²</span>
            <span className="block text-[0.8rem] text-mute">
              {t.project.floor} {floorLabel(u.floor, locale)}
              {u.outdoor && ` · ${t.outdoor[u.outdoor.kind]} ${u.outdoor.area} m²`}
            </span>
          </span>
          <span className="hidden sm:block">
            <UnitStatusChip status={u.status} />
          </span>
          <span className="relative col-span-2 sm:col-span-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute">€</span>
            <input
              id={`unit-price-${project.slug}-${u.id}`}
              className="input num min-h-10 py-1.5 pl-7"
              inputMode="numeric"
              placeholder={t.costs.onRequest}
              value={u.price ? formatNumber(u.price, locale) : ""}
              aria-label={`${t.project.price} ${u.name}`}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ""));
                onChange((p) => void (p.units[i].price = n > 0 ? n : null));
              }}
            />
          </span>
          <select
            id={`unit-status-${project.slug}-${u.id}`}
            className="input col-span-2 min-h-10 py-1.5 sm:col-span-1"
            value={u.status}
            aria-label={`${t.project.state} ${u.name}`}
            onChange={(e) => onChange((p) => void (p.units[i].status = e.target.value as UnitStatus))}
          >
            {(["available", "reserved", "sold"] as UnitStatus[]).map((s) => (
              <option key={s} value={s}>
                {t.unitStatus[s]}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}

function InfoPanel({ project, onChange }: { project: Project; onChange: (fn: (p: Project) => void) => void }) {
  const { locale, t } = useLocale();
  const [url, setUrl] = useState("");
  const [bad, setBad] = useState(false);
  const addEmbed = (e: React.FormEvent) => {
    e.preventDefault();
    let ok = false;
    try {
      ok = new URL(url).protocol === "https:";
    } catch {
      ok = false;
    }
    setBad(!ok);
    if (!ok) return;
    onChange((p) => {
      p.tours.push({ id: `embed-${Date.now()}`, kind: "embed", title: { it: t.admin.tourEmbedTitle, en: "External tour" }, url });
    });
    setUrl("");
  };

  return (
    <div className="grid gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="field">
          <span>{t.admin.status}</span>
          <select id="info-status" className="input" value={project.status} onChange={(e) => onChange((p) => void (p.status = e.target.value as ProjectStatus))}>
            {(["planning", "construction", "completed"] as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {t.status[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t.admin.start}</span>
          <input id="info-start" type="month" className="input" value={project.start} onChange={(e) => e.target.value && onChange((p) => void (p.start = e.target.value))} />
        </label>
        <label className="field">
          <span>{t.admin.delivery}</span>
          <input id="info-delivery" type="month" className="input" value={project.delivery} onChange={(e) => e.target.value && onChange((p) => void (p.delivery = e.target.value))} />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>{locale === "it" ? "Descrizione breve (IT)" : "Short description (IT)"}</span>
          <textarea id="info-summary-it" className="input" value={project.summary.it} onChange={(e) => onChange((p) => void (p.summary.it = e.target.value))} />
        </label>
        <label className="field">
          <span>{locale === "it" ? "Descrizione breve (EN)" : "Short description (EN)"}</span>
          <textarea id="info-summary-en" className="input" value={project.summary.en} onChange={(e) => onChange((p) => void (p.summary.en = e.target.value))} />
        </label>
      </div>

      <form onSubmit={addEmbed} className="grid gap-3 rounded-[var(--radius)] bg-board-2 p-4">
        <h3 className="heading text-lg">{t.admin.tourEmbed}</h3>
        <p className="text-[0.88rem] text-mute">{t.admin.tourEmbedHelp}</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input id="info-embed-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://my.matterport.com/show/?m=…" inputMode="url" />
          <button type="submit" className="btn btn-ink shrink-0">
            <Icon name="plus" size={18} />
            {t.admin.tourEmbedSave}
          </button>
        </div>
        {bad && <p className="text-[0.88rem] text-warn">{t.admin.tourEmbedBad}</p>}
        <ul className="grid gap-2">
          {project.tours.map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-3 rounded-[3px] border border-line bg-board px-3 py-2 text-[0.9rem]">
              <span className="flex min-w-0 items-center gap-2">
                <Icon name={x.kind === "panorama" ? "pano" : "external"} size={18} />
                <span className="truncate">
                  {tr(x.title, locale)}
                  {x.kind === "embed" && <span className="text-mute"> · {x.url}</span>}
                  {x.kind === "panorama" && <span className="text-mute"> · {x.scenes.length} 360°</span>}
                </span>
              </span>
              {x.kind === "embed" && (
                <button
                  type="button"
                  onClick={() => onChange((p) => void (p.tours = p.tours.filter((y) => y.id !== x.id)))}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] text-mute hover:bg-warn-bg hover:text-warn"
                  aria-label={t.admin.remove}
                >
                  <Icon name="trash" size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </form>
    </div>
  );
}

function BrandPanel({ data, onChange }: { data: TenantData; onChange: (fn: (d: TenantData) => void) => void }) {
  const { locale, t } = useLocale();
  const b = data.brand;
  const visits = b.visits ?? DEFAULT_HOURS;
  const field = (key: "name" | "monogram" | "email" | "phone" | "address", label: string, extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <label className="field">
      <span>{label}</span>
      <input id={`brand-${key}`} className="input" value={b[key]} onChange={(e) => onChange((d) => void (d.brand[key] = e.target.value))} {...extra} />
    </label>
  );
  return (
    <div className="grid gap-8 p-4 sm:p-6 xl:grid-cols-[1.2fr_1fr]">
      <div className="grid content-start gap-5">
        <h2 className="heading text-2xl">{t.admin.tabs.brand}</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          {field("name", t.admin.brandName)}
          {field("monogram", t.admin.monogram, { maxLength: 3 })}
        </div>
        <div className="grid gap-2">
          <span className="text-[0.85rem] font-semibold text-ink-2">{t.admin.color}</span>
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange((d) => void (d.brand.color = c))}
                aria-pressed={b.color.toLowerCase() === c.toLowerCase()}
                aria-label={c}
                className="h-10 w-10 rounded-[3px] border border-line-strong aria-pressed:ring-2 aria-pressed:ring-ink aria-pressed:ring-offset-2"
                style={{ background: c }}
              />
            ))}
            <input
              id="brand-color"
              type="color"
              value={b.color}
              onChange={(e) => onChange((d) => void (d.brand.color = e.target.value))}
              className="h-10 w-14 cursor-pointer rounded-[3px] border border-line-strong bg-board p-1"
              aria-label={t.admin.color}
            />
            <span className="num text-[0.85rem] text-mute">{b.color.toUpperCase()}</span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>{t.admin.taglineIt}</span>
            <textarea id="brand-tagline-it" className="input" value={b.tagline.it} onChange={(e) => onChange((d) => void (d.brand.tagline.it = e.target.value))} />
          </label>
          <label className="field">
            <span>{t.admin.taglineEn}</span>
            <textarea id="brand-tagline-en" className="input" value={b.tagline.en} onChange={(e) => onChange((d) => void (d.brand.tagline.en = e.target.value))} />
          </label>
        </div>
        <h3 className="label mt-2 text-mute">{t.admin.contacts}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("email", t.admin.email, { type: "email" })}
          {field("phone", t.admin.phone, { type: "tel" })}
          <div className="sm:col-span-2">{field("address", t.admin.address)}</div>
        </div>
        <h3 className="label mt-2 text-mute">{t.visit.adminTitle}</h3>
        <div className="grid gap-4">
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-[0.85rem] font-semibold text-ink-2">{t.visit.adminDays}</legend>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <label key={day} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius)] border border-line-strong bg-board px-3 text-[0.9rem]">
                  <input
                    id={`visit-day-${day}`}
                    type="checkbox"
                    className="h-4 w-4 accent-[var(--ink)]"
                    checked={visits.days.includes(day)}
                    onChange={(e) =>
                      onChange((d) => {
                        const v = (d.brand.visits ??= structuredClone(DEFAULT_HOURS));
                        v.days = e.target.checked ? [...new Set([...v.days, day])].sort() : v.days.filter((x) => x !== day);
                      })
                    }
                  />
                  {t.visit.weekdays[day]}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <label className="field">
              <span>{t.visit.adminSlots}</span>
              <input
                id="visit-slots"
                key={visits.slots.join()}
                className="input num"
                defaultValue={visits.slots.join(", ")}
                onBlur={(e) => {
                  const slots = [...new Set(e.target.value.match(/\b([01]?\d|2[0-3])[:.][0-5]\d\b/g) ?? [])].map((x) => x.replace(".", ":").padStart(5, "0")).sort();
                  if (slots.length) onChange((d) => void ((d.brand.visits ??= structuredClone(DEFAULT_HOURS)).slots = slots));
                }}
              />
            </label>
            <label className="field">
              <span>{t.visit.adminMinutes}</span>
              <input
                id="visit-minutes"
                type="number"
                min={15}
                max={240}
                step={15}
                className="input num"
                value={visits.minutes}
                onChange={(e) => onChange((d) => void ((d.brand.visits ??= structuredClone(DEFAULT_HOURS)).minutes = Math.max(15, Number(e.target.value) || 60)))}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Live preview of the brand on site elements */}
      <div className="grid content-start gap-3">
        <p className="label text-mute">Preview</p>
        <div className="overflow-hidden rounded-[var(--radius)] border border-line">
          <div className="flex items-center justify-between gap-3 border-b border-line bg-board px-4 py-3">
            <span className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-[3px] text-[0.8rem] font-bold" style={{ background: b.color, color: inkOn(b.color) }}>
                {b.monogram}
              </span>
              <span className="heading">{b.name}</span>
            </span>
            <span className="btn btn-brand min-h-9 px-3 py-1.5 text-[0.82rem]">{t.nav.requestInfo}</span>
          </div>
          <div className="grid gap-3 bg-ground p-4">
            <p className="display text-2xl">{t.home.title.replace("{city}", b.city)}</p>
            <p className="text-[0.9rem] text-ink-2">{tr(b.tagline, locale)}</p>
            <Bar value={62} state="active" />
            <span className="flex gap-2">
              <ProjectStatusChip status="construction" />
              <ProjectStatusChip status="completed" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
