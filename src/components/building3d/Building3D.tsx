"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppLink } from "@/components/ui/AppLink";
import { floorLabel, tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { overallProgress } from "@/lib/progress";
import { useTenant } from "@/lib/store";
import type { Dict } from "@/i18n/dictionaries";
import { LOCALES, type BuildingPlan, type Locale, type Project, type Unit, type UnitStatus } from "@/lib/types";
import { BuildingEngine, type Focus, type Pads, type View } from "./engine";
import { readPalette } from "./palette";
import { GROUPS, prepareBuilding, type Floor, type Room } from "./plan";
import { strings3d, type Strings3D } from "./strings";
import "./building3d.css";

type Theme = "scuro" | "chiaro";
const THEME_KEY = "cantiere-live.3d.tema";
const NONE: Focus = { floor: null, unit: null };

const fmtNum = (n: number, locale: string, digits = 1, min = 0) =>
  n.toLocaleString(locale === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: digits, minimumFractionDigits: min });
const fmtArea = (n: number, locale: string) => `${fmtNum(n, locale, 1, n < 10 ? 1 : 0)} m²`;

/** The 3D view of a building, in the console style of the Atlante delle Forniture. */
export function Building3D({ plan, slug, fontClass }: { plan: BuildingPlan; slug: string; fontClass: string }) {
  const { locale, t } = useLocale();
  const s = strings3d[locale];
  const tenant = useTenant();
  const building = useMemo(() => prepareBuilding(plan), [plan]);

  // Apartments of this building, live from the tenant data (the admin panel can change their status).
  const projects = tenant.projects.filter((p) => p.building === plan.id);
  const units = useMemo(() => {
    const m = new Map<string, { unit: Unit; project: Project }>();
    for (const p of tenant.projects.filter((x) => x.building === plan.id)) for (const u of p.units) m.set(u.id, { unit: u, project: p });
    return m;
  }, [tenant, plan.id]);

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const engine = useRef<BuildingEngine | null>(null);
  const [theme, setTheme] = useState<Theme>("scuro");
  const [explode, setExplode] = useState(0.6);
  const [view, setView] = useState<View>("axo");
  const [focus, setFocus] = useState<Focus>(NONE);
  const [hover, setHover] = useState<string | null>(null);
  const [layers, setLayers] = useState({ labels: true, dims: false });
  const [failed, setFailed] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [hint, setHint] = useState(true);

  const roomById = useMemo(() => new Map(building.floors.flatMap((f) => f.rooms.map((r) => [r.id, { room: r, floor: f }] as const))), [building]);
  const floorOfUnit = useCallback((unitId: string) => building.floors.find((f) => !f.roof && f.units.some((u) => u.unitId === unitId)), [building]);

  const select = useCallback(
    (next: Focus) => {
      // A unit on the roof (a terrace) selects the apartment on its own floor.
      if (next.unit) {
        const f = floorOfUnit(next.unit);
        if (f) next = { floor: f.id, unit: next.unit };
      }
      setFocus(next);
      setSheet(next.floor !== null);
    },
    [floorOfUnit],
  );

  // Theme: the choice saved in this browser, else the system's.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch {
      /* storage blocked: follow the system */
    }
    const initial: Theme = saved === "chiaro" || saved === "scuro" ? saved : window.matchMedia?.("(prefers-color-scheme: light)").matches ? "chiaro" : "scuro";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved theme is only readable in the browser
    setTheme(initial);
    // A unit named in the link (…/3d/#B1) opens selected.
    const id = decodeURIComponent(location.hash.slice(1));
    if (id && floorOfUnit(id)) select({ floor: null, unit: id });
  }, [floorOfUnit, select]);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* not saved: the choice lasts for this visit */
    }
  };

  // The engine lives as long as the page.
  useEffect(() => {
    const stage = stageRef.current;
    const overlay = overlayRef.current;
    if (!stage || !overlay) return;
    let e: BuildingEngine;
    try {
      e = new BuildingEngine(stage, overlay, building, {
        hover: (id) => setHover(id),
        pick: (f) => select(f.unit ? f : f.floor ? { floor: f.floor, unit: null } : NONE),
      });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL support is only known once a context is requested
      setFailed(true);
      return;
    }
    engine.current = e;
    if (rootRef.current) e.setPalette(readPalette(rootRef.current));
    return () => {
      e.dispose();
      engine.current = null;
    };
  }, [building, select]);

  useEffect(() => {
    if (rootRef.current) engine.current?.setPalette(readPalette(rootRef.current));
  }, [theme]);
  useEffect(() => engine.current?.setExplode(explode), [explode]);
  useEffect(() => engine.current?.setView(view), [view]);
  useEffect(() => engine.current?.setFocus(focus), [focus]);
  useEffect(() => engine.current?.setLayers(layers), [layers]);
  useEffect(() => engine.current?.setHover(hover), [hover]);
  useEffect(() => {
    engine.current?.refreshOverlay();
  });

  // The free area of the stage, between the panels: the camera frames the building there.
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const isNarrow = w < 860;
      setNarrow(isNarrow);
      const pads: Pads = isNarrow
        ? { t: 52 + 48, l: 0, r: 0, b: 64 + (sheet ? Math.round(h * 0.46) : 0) }
        : { t: 52 + 8, l: w < 1100 ? 244 : 272, r: w < 1100 ? 352 : 392, b: 30 + 100 };
      engine.current?.setPads(pads);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [sheet, failed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") select(focus.unit ? { floor: focus.floor, unit: null } : NONE);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus, select]);

  const roomName = (r: Room) => (r.name ? tr(r.name, locale) : s.kinds[r.kind]);
  const floorCode = (f: Floor) => s.code(f.level, f.roof);
  const indoorFloors = building.floors.filter((f) => !f.roof);
  const allUnits = [...units.values()];
  const free = allUnits.filter((x) => x.unit.status === "available").length;
  const focusFloor = building.floors.find((f) => f.id === focus.floor) ?? null;
  const hov = hover ? roomById.get(hover) : null;
  const projectOf = (f: Floor) => projects.find((p) => p.slug === f.project);
  const back = `/${locale}/projects/${slug}/`;
  const switchTo = (l: string) => `/${l}/projects/${slug}/3d/`;

  return (
    <div ref={rootRef} className={`b3d ${fontClass}`} data-tema={theme} data-narrow={narrow ? "true" : "false"}>
      <header className="b3d-top">
        <AppLink href={back} className="b3d-brand" aria-label={`${s.back}: ${plan.name}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
            <path d="M12 2.5 21 7.5v9l-9 5-9-5v-9z" />
            <path d="M3 7.5 12 12.5l9-5M12 12.5v9" />
          </svg>
          <b>{plan.name}</b>
          <small>{s.tag}</small>
        </AppLink>
        <div className="b3d-modes" role="group" aria-label={s.viewsLabel}>
          {(Object.keys(s.views) as View[]).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>
              {s.views[v]}
            </button>
          ))}
        </div>
        <span className="b3d-spacer" />
        <div className="b3d-seg" role="group" aria-label={s.theme}>
          {(["scuro", "chiaro"] as Theme[]).map((x) => (
            <button key={x} type="button" aria-pressed={theme === x} onClick={() => changeTheme(x)} title={x === "scuro" ? s.themeDark : s.themeLight}>
              {x === "scuro" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
                </svg>
              )}
              <span className="b3d-sr">{x === "scuro" ? s.themeDark : s.themeLight}</span>
            </button>
          ))}
        </div>
        <div className="b3d-seg" role="group" aria-label="Language">
          {LOCALES.map((l) => (
            <AppLink key={l} href={switchTo(l)} aria-current={l === locale ? "true" : undefined} hrefLang={l}>
              {l.toUpperCase()}
            </AppLink>
          ))}
        </div>
        <AppLink href={back} className="b3d-btn">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          <span className="b3d-bl">{s.back}</span>
        </AppLink>
      </header>

      <div
        ref={stageRef}
        className="b3d-stage"
        role="img"
        aria-label={`${plan.name}, ${s.tag}. ${s.hint}`}
        onPointerDown={() => setHint(false)}
        onWheel={() => setHint(false)}
      >
        <div className="b3d-cartouche" aria-hidden="true">
          <span>
            <b>{plan.name}</b> · {projects[0]?.location.address}, {projects[0]?.location.city}
          </span>
          <span>
            {indoorFloors.length} {s.storeys.toLowerCase()} + {s.code(0, true)} · {fmtNum(building.x1 - building.x0, locale, 1, 1)} × {fmtNum(building.y1 - building.y0, locale, 1, 1)} m
          </span>
          {plan.illustrative && <em>{s.scale}</em>}
        </div>

        <div ref={overlayRef} className="b3d-overlay">
          <svg className="b3d-leader-svg" aria-hidden="true">
            {building.floors.map((f) => (
              <line key={f.id} data-leader-line={f.id} data-current={focus.floor === f.id ? "true" : undefined} />
            ))}
          </svg>
          {building.floors.map((f) => {
            const p = projectOf(f);
            return (
              <button
                key={f.id}
                type="button"
                data-leader={f.id}
                className="b3d-lead"
                data-current={focus.floor === f.id ? "true" : undefined}
                onClick={() => select(focus.floor === f.id && !focus.unit ? NONE : { floor: f.id, unit: null })}
              >
                <span className="b3d-lead-code">{floorCode(f)}</span>
                {tr(f.name, locale)}
                {!f.roof && (
                  <small>
                    {f.units.length} {s.apt}
                    {p && <i className={`b3d-pip st-${p.status}`} />}
                  </small>
                )}
              </button>
            );
          })}
          {indoorFloors.flatMap((f) =>
            f.units.map((u) => {
              const info = units.get(u.unitId);
              return (
                <button
                  key={`${f.id}:${u.unitId}`}
                  type="button"
                  data-tag={`${f.id}:${u.unitId}`}
                  className="b3d-tag"
                  data-current={focus.unit === u.unitId ? "true" : undefined}
                  onClick={() => select({ floor: f.id, unit: u.unitId })}
                >
                  <i className={`b3d-pip us-${info?.unit.status ?? "sold"}`} />
                  {u.unitId}
                </button>
              );
            }),
          )}
          {building.floors.flatMap((f) =>
            f.rooms.map((r) => (
              <span key={r.id} data-room={r.id} className="b3d-room" style={{ ["--c" as string]: `var(--k-${r.group})` }}>
                {roomName(r)}
                <small>{fmtArea(r.area, locale)}</small>
              </span>
            )),
          )}
          <div data-chip className="b3d-chip" aria-hidden="true" style={hov ? { ["--c" as string]: `var(--k-${hov.room.group})` } : undefined}>
            {hov && (
              <>
                <small>
                  {hov.room.unitId ? `${hov.room.unitId} · ` : ""}
                  {floorCode(hov.floor)}
                </small>
                {roomName(hov.room)} · {fmtArea(hov.room.area, locale)}
              </>
            )}
          </div>
          <div data-target className="b3d-target" aria-hidden="true" />
          <span data-dim="w" className="b3d-dim">
            {fmtNum(building.x1 - building.x0, locale, 2, 2)} m
          </span>
          <span data-dim="d" className="b3d-dim">
            {fmtNum(building.y1 - building.y0, locale, 2, 2)} m
          </span>
          {plan.street && (
            <span data-street className="b3d-street">
              {plan.street}
            </span>
          )}
        </div>

        {failed && <p className="b3d-failed">{s.unsupported}</p>}
        <p className="b3d-hint" data-hidden={hint ? undefined : "true"}>
          {s.hint}
        </p>
      </div>

      {/* Floors, key and layers */}
      <aside className="b3d-panel b3d-left" aria-label={s.floors}>
        <section className="b3d-sec">
          <h3 className="b3d-eyebrow">{s.floors}</h3>
          <div className="b3d-flist">
            {[...building.floors].reverse().map((f) => {
              const p = projectOf(f);
              return (
                <button
                  key={f.id}
                  type="button"
                  className="b3d-frow"
                  aria-current={focus.floor === f.id ? "true" : undefined}
                  onClick={() => select(focus.floor === f.id && !focus.unit ? NONE : { floor: f.id, unit: null })}
                >
                  <span className="b3d-code">{floorCode(f)}</span>
                  <span className="b3d-fname">
                    {tr(f.name, locale)}
                    {p && <small>{tr(p.subtitle, locale).split("·")[0].trim()}</small>}
                  </span>
                  <span className="b3d-fcount">{f.roof ? "—" : f.units.length}</span>
                </button>
              );
            })}
          </div>
        </section>
        <section className="b3d-sec">
          <h3 className="b3d-eyebrow">{s.key}</h3>
          <div className="b3d-key">
            {GROUPS.map((g) => (
              <span key={g} style={{ ["--c" as string]: `var(--k-${g})` }}>
                <i />
                {s.groups[g]}
              </span>
            ))}
          </div>
        </section>
        <section className="b3d-sec">
          <h3 className="b3d-eyebrow">{s.layers}</h3>
          {(["labels", "dims"] as const).map((k) => (
            <button key={k} type="button" className="b3d-layer" aria-pressed={layers[k]} onClick={() => setLayers((l) => ({ ...l, [k]: !l[k] }))}>
              <span>{k === "labels" ? s.labels : s.dims}</span>
              <i className="b3d-switch" />
            </button>
          ))}
        </section>
      </aside>

      {/* Floors strip on phones */}
      <nav className="b3d-strip" aria-label={s.floors}>
        <button type="button" aria-pressed={!focus.floor} onClick={() => select(NONE)}>
          {s.building}
        </button>
        {building.floors.map((f) => (
          <button key={f.id} type="button" aria-pressed={focus.floor === f.id} onClick={() => select({ floor: f.id, unit: null })}>
            {floorCode(f)}
          </button>
        ))}
      </nav>

      {/* Dossier */}
      <aside className="b3d-panel b3d-right" data-open={sheet ? "true" : "false"} aria-label={s.building}>
        <button type="button" className="b3d-handle" aria-label={s.open} aria-expanded={sheet} onClick={() => setSheet((x) => !x)} />
        {focus.unit && units.get(focus.unit) && focusFloor ? (
          <UnitDossier
            unitId={focus.unit}
            info={units.get(focus.unit)!}
            floor={focusFloor}
            roof={building.floors.find((f) => f.roof)}
            onBack={() => select({ floor: focusFloor.id, unit: null })}
            onHover={setHover}
            roomName={roomName}
            locale={locale}
            s={s}
            t={t}
          />
        ) : focusFloor ? (
          <div>
            <div className="b3d-dhead">
              <button type="button" className="b3d-back" onClick={() => select(NONE)}>
                ← {s.wholeBuilding}
              </button>
              <h2>{tr(focusFloor.name, locale)}</h2>
              <p className="b3d-meta">
                {projectOf(focusFloor) ? `${projectOf(focusFloor)!.name} · ${tr(projectOf(focusFloor)!.subtitle, locale)} · ${t.status[projectOf(focusFloor)!.status]}` : ""}
              </p>
            </div>
            {focusFloor.roof ? (
              <p className="b3d-note b3d-pad">{s.roofNote}</p>
            ) : (
              <>
                <div className="b3d-kpis b3d-pad">
                  <Kpi value={String(focusFloor.units.length)} label={s.apartments} />
                  <Kpi value={fmtArea(Math.round(focusFloor.units.reduce((n, u) => n + u.area, 0)), locale)} label={s.floorArea} />
                  <Kpi value={String(focusFloor.units.filter((u) => units.get(u.unitId)?.unit.status === "available").length)} label={s.available} />
                </div>
                <div className="b3d-rows">
                  {focusFloor.units.map((u) => {
                    const info = units.get(u.unitId);
                    return (
                      <button
                        key={u.unitId}
                        type="button"
                        className="b3d-row"
                        onClick={() => select({ floor: focusFloor.id, unit: u.unitId })}
                        onMouseEnter={() => setHover(u.rooms[0] ?? null)}
                        onMouseLeave={() => setHover(null)}
                      >
                        <span className="b3d-rn">
                          {u.unitId}
                          <small>{info ? t.rooms(info.unit.rooms) : ""}</small>
                        </span>
                        <span className="b3d-rs">{info ? `${info.unit.area} m²` : ""}</span>
                        {info && <StatusPill status={info.unit.status} label={t.unitStatus[info.unit.status]} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          <div>
            <div className="b3d-dhead">
              <p className="b3d-eyebrow">{s.building}</p>
              <h2>{plan.name}</h2>
              <p className="b3d-meta">
                {projects[0]?.location.address} · {projects[0]?.location.district}, {projects[0]?.location.city}
              </p>
            </div>
            <div className="b3d-kpis b3d-pad">
              <Kpi value={String(indoorFloors.length)} label={s.storeys} />
              <Kpi value={String(allUnits.length)} label={s.apartments} />
              <Kpi value={String(free)} label={s.available} />
            </div>
            <section className="b3d-sec">
              <h3 className="b3d-eyebrow">{s.phases}</h3>
              <div className="b3d-bars">
                {projects.map((p) => {
                  const pct = overallProgress(p);
                  const fl = building.floors.filter((f) => f.project === p.slug && !f.roof).map(floorCode);
                  return (
                    <AppLink key={p.slug} href={`/${locale}/projects/${p.slug}/`} className="b3d-bar">
                      <span className="b3d-blbl">
                        <span>{tr(p.subtitle, locale)}</span>
                        <span className="b3d-bval">{fl.join(" · ")}</span>
                      </span>
                      <span className="b3d-track">
                        <span style={{ width: `${pct}%`, background: p.status === "completed" ? "var(--ink)" : "var(--signal)" }} />
                      </span>
                      <span className="b3d-pct">{pct}%</span>
                    </AppLink>
                  );
                })}
              </div>
            </section>
            {plan.illustrative && <p className="b3d-note b3d-pad">{s.illustrative}</p>}
          </div>
        )}
      </aside>

      <div className="b3d-console">
        <div className="b3d-slider">
          <span className="b3d-tick" data-on={explode < 0.05 ? "true" : undefined}>
            {s.assembled}
          </span>
          <span className="b3d-trackwrap">
            <input
              id="b3d-explode"
              type="range"
              min={0}
              max={100}
              value={Math.round(explode * 100)}
              onChange={(e) => setExplode(Number(e.target.value) / 100)}
              aria-label={s.explode}
              className="b3d-range"
            />
          </span>
          <span className="b3d-tick" data-on={explode > 0.95 ? "true" : undefined}>
            {s.explode}
          </span>
          <span className="b3d-value">{Math.round(explode * 100)}%</span>
        </div>
        <button type="button" className="b3d-btn" onClick={() => engine.current?.reset()} title={s.recenter}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </svg>
          <span className="b3d-bl">{s.recenter}</span>
        </button>
      </div>

      <div className="b3d-tape" aria-label={s.availability}>
        <span className="b3d-tape-tag">{s.availability.toUpperCase()}</span>
        <span className="b3d-tape-win">
          <span className="b3d-tape-track">
            {[0, 1].map((k) => (
              <span key={k} aria-hidden={k === 1 ? "true" : undefined}>
                {indoorFloors.flatMap((f) =>
                  f.units.map((u) => {
                    const info = units.get(u.unitId);
                    return (
                      <span key={`${k}-${u.unitId}`}>
                        <b>{u.unitId}</b> {floorCode(f)} · {info ? `${t.rooms(info.unit.rooms).toLowerCase()} ${info.unit.area} m² · ` : ""}
                        <em className={`us-${info?.unit.status ?? "sold"}`}>{info ? t.unitStatus[info.unit.status].toLowerCase() : ""}</em>
                      </span>
                    );
                  }),
                )}
              </span>
            ))}
          </span>
        </span>
      </div>
    </div>
  );
}

function UnitDossier({
  unitId,
  info,
  floor,
  roof,
  onBack,
  onHover,
  roomName,
  locale,
  s,
  t,
}: {
  locale: Locale;
  s: Strings3D;
  t: Dict;
  unitId: string;
  info: { unit: Unit; project: Project };
  floor: Floor;
  roof?: Floor;
  onBack: () => void;
  onHover: (id: string | null) => void;
  roomName: (r: Room) => string;
}) {
  const { unit, project } = info;
  const rooms = [...floor.rooms.filter((r) => r.unitId === unitId), ...(roof?.rooms.filter((r) => r.unitId === unitId) ?? [])].sort((a, b) => b.area - a.area);
  const max = Math.max(...rooms.map((r) => r.area));
  const message =
    locale === "it"
      ? `Vorrei informazioni sull'appartamento ${unit.name} (${t.rooms(unit.rooms).toLowerCase()}, ${unit.area} m²) di ${project.name}.`
      : `I'd like information on apartment ${unit.name} (${t.rooms(unit.rooms)}, ${unit.area} m²) at ${project.name}.`;
  return (
    <div>
      <div className="b3d-dhead">
        <button type="button" className="b3d-back" onClick={onBack}>
          ← {tr(floor.name, locale)}
        </button>
        <h2>{unit.name}</h2>
        <p className="b3d-meta">
          {t.rooms(unit.rooms)} · {s.floor} {floorLabel(unit.floor, locale)} · {project.name} · {tr(project.subtitle, locale).split("·")[0].trim()}
        </p>
        <span>
          <StatusPill status={unit.status} label={t.unitStatus[unit.status]} />
        </span>
      </div>
      <div className="b3d-kpis b3d-pad">
        <Kpi value={`${unit.area}`} label="m²" />
        <Kpi value={String(unit.rooms)} label={s.roomsCount} />
        <Kpi value={String(unit.bathrooms)} label={s.baths} />
      </div>
      <section className="b3d-sec">
        <h3 className="b3d-eyebrow">{s.rooms}</h3>
        <div className="b3d-bars">
          {rooms.map((r) => (
            <div key={r.id} className="b3d-bar" onMouseEnter={() => onHover(r.id)} onMouseLeave={() => onHover(null)}>
              <span className="b3d-blbl">
                <span>{roomName(r)}</span>
              </span>
              <span className="b3d-track">
                <span style={{ width: `${(r.area / max) * 100}%`, background: `var(--k-${r.group})` }} />
              </span>
              <span className="b3d-pct">{fmtArea(r.area, locale)}</span>
            </div>
          ))}
        </div>
        {unit.outdoor && (
          <p className="b3d-note">
            {s.outdoor}: <b>{t.outdoor[unit.outdoor.kind]} {unit.outdoor.area} m²</b>
          </p>
        )}
      </section>
      <div className="b3d-acts b3d-pad">
        {unit.status !== "sold" && (
          <AppLink
            href={`/${locale}/projects/${project.slug}/#contatti`}
            className="b3d-act b3d-act-main"
            onClick={() => {
              try {
                sessionStorage.setItem("cl:ask", JSON.stringify({ project: project.slug, message }));
              } catch {
                /* the form opens empty */
              }
            }}
          >
            {s.ask}
          </AppLink>
        )}
        {project.tours.length > 0 && (
          <AppLink href={`/${locale}/projects/${project.slug}/tour/`} className="b3d-act">
            {s.tour}
          </AppLink>
        )}
      </div>
    </div>
  );
}

function Kpi({ value, label }: { value: string; label: string }) {
  return (
    <div className="b3d-kpi">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function StatusPill({ status, label }: { status: UnitStatus; label: string }) {
  return <span className={`b3d-pill us-${status}`}>{label}</span>;
}
