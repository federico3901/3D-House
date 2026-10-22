"use client";

import { useRef, useState } from "react";
import { AppLink } from "@/components/ui/AppLink";
import { Icon } from "@/components/ui/Icon";
import { Img } from "@/components/ui/Img";
import { tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { pageHref } from "@/lib/paths";
import type { Tour } from "@/lib/types";
import { PanoramaViewer, type ViewerHandle } from "./PanoramaViewer";

/** A tour with its controls: rooms strip, zoom, auto-rotate, full screen. `page` fills the screen (tour page). */
export function TourPlayer({ tour, fullscreenHref, page = false }: { tour: Tour; fullscreenHref?: string; page?: boolean }) {
  const { locale, t } = useLocale();
  const frameRef = useRef<HTMLDivElement>(null);
  const viewer = useRef<ViewerHandle | null>(null);
  const [sceneId, setSceneId] = useState(tour.kind === "panorama" ? tour.scenes[0]?.id : "");
  const [rotate, setRotate] = useState(true);

  const goFullscreen = async () => {
    const el = frameRef.current;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el?.requestFullscreen) await el.requestFullscreen();
      else throw new Error("no fullscreen");
    } catch {
      if (fullscreenHref) window.location.assign(pageHref(fullscreenHref));
    }
  };

  if (tour.kind === "embed") {
    return (
      <div className="grid gap-3">
        <div className={`overflow-hidden rounded-[var(--radius)] bg-night ${page ? "h-full" : "aspect-[16/10] max-h-[640px] w-full"}`}>
          <iframe
            src={tour.url}
            title={tr(tour.title, locale)}
            className="h-full w-full border-0"
            allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <a href={tour.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[0.9rem] font-semibold underline-offset-4 hover:underline">
          <Icon name="external" size={16} />
          {t.tour.external}
        </a>
      </div>
    );
  }

  const scenes = tour.scenes;
  const current = scenes.find((s) => s.id === sceneId) ?? scenes[0];
  const ctrl = "grid h-10 w-10 place-items-center rounded-[3px] text-white/90 hover:bg-white/15 hover:text-white aria-pressed:bg-brand aria-pressed:text-brand-ink";

  return (
    <div ref={frameRef} className={`on-night relative overflow-hidden bg-night ${page ? "h-full" : "rounded-[var(--radius)]"}`}>
      <PanoramaViewer
        scenes={scenes}
        sceneId={current.id}
        onSceneChange={setSceneId}
        autoRotate={rotate}
        handleRef={viewer}
        className={page ? "h-full w-full" : "aspect-[4/3] max-h-[680px] w-full sm:aspect-[16/9]"}
      />

      {/* Top: room name and controls */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent p-3 sm:p-4">
        <div className="min-w-0 text-white">
          <p className="label text-white/70">{tr(tour.title, locale)}</p>
          <p className="heading truncate text-lg sm:text-xl">{tr(current.title, locale)}</p>
        </div>
        <div className="pointer-events-auto flex shrink-0 items-center gap-0.5 rounded-[4px] bg-black/45 p-1 backdrop-blur-md">
          <button type="button" className={ctrl} onClick={() => viewer.current?.zoom(-8)} aria-label={t.tour.zoomIn} title={t.tour.zoomIn}>
            <Icon name="plus" size={18} />
          </button>
          <button type="button" className={ctrl} onClick={() => viewer.current?.zoom(8)} aria-label={t.tour.zoomOut} title={t.tour.zoomOut}>
            <Icon name="minus" size={18} />
          </button>
          <button type="button" className={ctrl} aria-pressed={rotate} onClick={() => setRotate((r) => !r)} aria-label={t.tour.rotate} title={t.tour.rotate}>
            <Icon name="rotate" size={18} />
          </button>
          {!page && (
            <button type="button" className={ctrl} onClick={goFullscreen} aria-label={t.tour.fullscreen} title={t.tour.fullscreen}>
              <Icon name="expand" size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Bottom: rooms */}
      {scenes.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 sm:p-4 sm:pt-10">
          <div className="scrollbar-none flex gap-2 overflow-x-auto" role="tablist" aria-label={t.tour.scenes}>
            {scenes.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={s.id === current.id}
                onClick={() => setSceneId(s.id)}
                className="group flex shrink-0 items-center gap-2 rounded-[4px] border border-white/20 bg-black/40 p-1 pr-3 text-left text-white backdrop-blur-md transition hover:border-white/60 aria-selected:border-brand aria-selected:bg-black/60"
              >
                <Img src={s.thumb} alt="" className="h-9 w-14 rounded-[2px] object-cover" />
                <span className="text-[0.82rem] font-semibold">{tr(s.title, locale)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!page && fullscreenHref && (
        <AppLink href={fullscreenHref} className="sr-only focus:not-sr-only focus:absolute focus:bottom-3 focus:right-3 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-ink">
          {t.project.fullscreen}
        </AppLink>
      )}
    </div>
  );
}
