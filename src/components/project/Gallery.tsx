"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Img } from "@/components/ui/Img";
import { tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import type { Photo } from "@/lib/types";

/** Photo mosaic (one large, two small, "+n") and a full-screen viewer with arrows, swipe and keyboard. */
export function Gallery({ photos }: { photos: Photo[] }) {
  const { locale, t } = useLocale();
  const [open, setOpen] = useState<number | null>(null);
  const touchX = useRef(0);
  const n = photos.length;
  const go = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + n) % n)), [n]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, go]);

  if (!n) return null;
  const side = photos.slice(1, 3);

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-[2fr_1fr] sm:grid-rows-2">
        <button type="button" onClick={() => setOpen(0)} className="group relative overflow-hidden rounded-[var(--radius)] bg-night sm:row-span-2">
          <Img
            src={photos[0].src}
            alt={tr(photos[0].alt, locale)}
            priority
            sizes="(min-width: 640px) 66vw, 100vw"
            className="aspect-[4/3] h-full w-full object-cover transition duration-700 group-hover:scale-[1.02] sm:aspect-auto"
          />
        </button>
        {side.map((p, i) => (
          <button
            key={p.src}
            type="button"
            onClick={() => setOpen(i + 1)}
            className="group relative hidden overflow-hidden rounded-[var(--radius)] bg-night sm:block"
          >
            <Img
              src={p.src}
              alt={tr(p.alt, locale)}
              sizes="33vw"
              className="aspect-[4/3] h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
            {i === 1 && n > 3 && (
              <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
                <span className="display text-3xl">+{n - 3}</span>
              </span>
            )}
          </button>
        ))}
      </div>

      {open !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t.project.gallery}
          className="fixed inset-0 z-50 grid grid-rows-[auto_1fr_auto] bg-black/95 text-white"
          onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          }}
        >
          <div className="flex items-center justify-between p-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
            <span className="label num text-white/70">
              {t.project.photo} {open + 1} {t.project.of} {n}
            </span>
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/10"
              aria-label={t.nav.close}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="relative grid min-h-0 place-items-center px-4">
            <Img src={photos[open].src} alt={tr(photos[open].alt, locale)} loading="eager" className="max-h-full max-w-full object-contain" />
            <button
              type="button"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="←"
            >
              <Icon name="back" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="→"
            >
              <Icon name="arrow" />
            </button>
          </div>
          <p className="p-4 text-center text-white/80" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            {tr(photos[open].alt, locale)}
          </p>
        </div>
      )}
    </>
  );
}
