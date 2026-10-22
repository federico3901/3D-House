"use client";

import { inkOn } from "@/lib/format";
import { useTenant } from "@/lib/store";

/** The impresa's colour as CSS variables, so every button, bar and highlight follows the brand. */
export function BrandStyle() {
  const { color } = useTenant().brand;
  const safe = /^#[0-9a-f]{6}$/i.test(color) ? color : "#f2b200";
  return <style>{`:root{--brand:${safe};--brand-ink:${inkOn(safe)}}`}</style>;
}
