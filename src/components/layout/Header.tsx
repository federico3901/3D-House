"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLink } from "@/components/ui/AppLink";
import { Icon } from "@/components/ui/Icon";
import { useLocale } from "@/lib/locale";
import { LOCALES, type Locale } from "@/lib/types";
import { Logo } from "./Logo";

/** The same page in another language: /it/projects/x/ → /en/projects/x/ */
function switchLocale(pathname: string | null, to: Locale) {
  const parts = (pathname ?? "/").split("/");
  if (LOCALES.includes(parts[1] as Locale)) parts[1] = to;
  else return `/${to}/`;
  const path = parts.join("/");
  return path.endsWith("/") ? path : `${path}/`;
}

export function Header() {
  const { locale, t } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const nav = [
    { href: `/${locale}/projects/`, label: t.nav.projects },
    { href: `/${locale}/#cantieri`, label: t.nav.construction },
    { href: `/${locale}/#realizzati`, label: t.nav.completed },
    { href: `/${locale}/#contatti`, label: t.nav.contact },
  ];

  const langSwitch = (
    <div className="flex items-center rounded-[3px] border border-line-strong p-0.5" aria-label="Language">
      {LOCALES.map((l) => (
        <AppLink
          key={l}
          href={switchLocale(pathname, l)}
          hrefLang={l}
          aria-current={l === locale ? "true" : undefined}
          className={`label rounded-[2px] px-2 py-1 ${l === locale ? "bg-ink text-board" : "text-ink-2 hover:text-ink"}`}
        >
          {l.toUpperCase()}
        </AppLink>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-board/90 backdrop-blur-md print:hidden" style={{ top: "env(safe-area-inset-top, 0px)" }}>
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <AppLink href={`/${locale}/`} className="shrink-0">
          <Logo />
        </AppLink>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {nav.map((n) => (
            <AppLink key={n.href} href={n.href} className="rounded-[3px] px-3 py-2 text-[0.95rem] font-medium text-ink-2 hover:bg-board-2 hover:text-ink">
              {n.label}
            </AppLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <AppLink href={`/${locale}/admin/`} className="text-[0.9rem] font-medium text-mute hover:text-ink">
            {t.nav.admin}
          </AppLink>
          {langSwitch}
          <AppLink href={`/${locale}/#contatti`} className="btn btn-brand">
            {t.nav.requestInfo}
          </AppLink>
        </div>

        <button
          type="button"
          className="btn btn-line px-3 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <Icon name={open ? "close" : "menu"} />
          <span className="sr-only">{open ? t.nav.close : t.nav.menu}</span>
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-board lg:hidden">
          <nav className="wrap grid gap-1 py-4" aria-label="Main">
            {nav.map((n) => (
              <AppLink key={n.href} href={n.href} onClick={() => setOpen(false)} className="heading rounded-[3px] px-2 py-3 text-xl hover:bg-board-2">
                {n.label}
              </AppLink>
            ))}
            <AppLink href={`/${locale}/admin/`} onClick={() => setOpen(false)} className="rounded-[3px] px-2 py-3 text-mute hover:bg-board-2">
              {t.nav.admin}
            </AppLink>
            <div className="mt-3 flex items-center justify-between gap-3">
              {langSwitch}
              <AppLink href={`/${locale}/#contatti`} onClick={() => setOpen(false)} className="btn btn-brand">
                {t.nav.requestInfo}
              </AppLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
