import type { Metadata } from "next";
import { LOCALES, type Locale } from "./types";

/** Public address of the site: set NEXT_PUBLIC_SITE_URL when building for a real domain. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.democostruzioni.example";

/** Canonical URL and language versions of a page; `path` is what follows the locale, e.g. "/projects/". */
export function alternates(locale: Locale, path: string): Metadata["alternates"] {
  return {
    canonical: `/${locale}${path}`,
    languages: { ...Object.fromEntries(LOCALES.map((l) => [l, `/${l}${path}`])), "x-default": `/it${path}` },
  };
}

/** A schema.org object, ready for <script type="application/ld+json">. */
export const jsonLd = (data: object) => ({ __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c") });
