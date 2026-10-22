"use client";

import { useTenant } from "@/lib/store";

export function Logo({ onNight = false }: { onNight?: boolean }) {
  const { brand } = useTenant();
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-[3px] bg-brand text-brand-ink"
        aria-hidden="true"
      >
        <span className="display text-[0.95rem] leading-none">{brand.monogram}</span>
      </span>
      <span className={`heading text-[1.05rem] leading-tight ${onNight ? "text-night-ink" : "text-ink"}`}>{brand.name}</span>
    </span>
  );
}
