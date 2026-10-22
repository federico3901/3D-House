"use client";

import { createContext, useContext } from "react";
import { dictionaries, type Dict } from "@/i18n/dictionaries";
import type { Locale } from "./types";

const LocaleContext = createContext<Locale>("it");

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): { locale: Locale; t: Dict } {
  const locale = useContext(LocaleContext);
  return { locale, t: dictionaries[locale] };
}
