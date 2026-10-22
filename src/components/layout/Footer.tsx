"use client";

import { AppLink } from "@/components/ui/AppLink";
import { tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { useTenant } from "@/lib/store";
import { Logo } from "./Logo";

export function Footer() {
  const { brand, projects } = useTenant();
  const { locale, t } = useLocale();
  return (
    <footer className="on-night bg-night text-night-ink">
      <div className="wrap grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="grid content-start gap-4">
          <Logo onNight />
          <p className="max-w-[44ch] text-night-mute">{tr(brand.tagline, locale)}</p>
        </div>
        <div className="grid content-start gap-2 text-[0.95rem]">
          <p className="label text-night-mute">{t.nav.projects}</p>
          {projects.map((p) => (
            <AppLink key={p.slug} href={`/${locale}/projects/${p.slug}/`} className="hover:text-brand">
              {p.name} · {tr(p.subtitle, locale)}
            </AppLink>
          ))}
          <AppLink href={`/${locale}/admin/`} className="mt-2 text-night-mute hover:text-brand">
            {t.nav.admin}
          </AppLink>
        </div>
        <div className="grid content-start gap-2 text-[0.95rem]">
          <p className="label text-night-mute">{t.contact.office}</p>
          <p>{brand.address}</p>
          <p className="num select-all">{brand.phone}</p>
          <p className="select-all">{brand.email}</p>
        </div>
      </div>
      <div className="border-t border-night-line">
        <div className="wrap flex flex-col gap-2 py-5 text-[0.8rem] text-night-mute md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {brand.name} · {brand.vat} · {t.footer.rights}
          </p>
          <p>
            {t.footer.credits} · <span className="text-night-ink">{t.footer.powered}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
