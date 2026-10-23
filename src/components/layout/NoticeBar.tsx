"use client";

import { tr } from "@/lib/format";
import { useLocale } from "@/lib/locale";
import { useTenant } from "@/lib/store";

export function NoticeBar() {
  const { notice } = useTenant();
  const { locale } = useLocale();
  if (!notice) return null;
  return (
    <div className="border-b border-line bg-board-2 text-[0.8rem] text-ink-2 print:hidden">
      <p className="wrap py-1.5">
        <span className="label mr-2 rounded-[3px] bg-ink px-1.5 py-0.5 text-[0.62rem] text-board">Demo</span>
        {tr(notice, locale)}
      </p>
    </div>
  );
}
