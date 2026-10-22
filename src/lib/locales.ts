import { LOCALES, type Locale } from "./types";

export const hasLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);
