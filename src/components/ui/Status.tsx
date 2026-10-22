"use client";

import { useLocale } from "@/lib/locale";
import type { ProjectStatus, UnitStatus } from "@/lib/types";

export function ProjectStatusChip({ status, onNight = false }: { status: ProjectStatus; onNight?: boolean }) {
  const { t } = useLocale();
  const tone =
    status === "construction"
      ? "bg-brand text-brand-ink"
      : onNight
        ? "bg-night-ink text-night"
        : "bg-ink text-board";
  return (
    <span className={`label inline-flex w-fit items-center gap-1.5 rounded-[3px] px-2 py-1 ${tone}`}>
      {status === "construction" && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {t.status[status]}
    </span>
  );
}

const unitTone: Record<UnitStatus, string> = {
  available: "bg-ok-bg text-ok",
  reserved: "bg-warn-bg text-warn",
  sold: "bg-sold-bg text-sold",
};

export function UnitStatusChip({ status }: { status: UnitStatus }) {
  const { t } = useLocale();
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.8rem] font-semibold ${unitTone[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t.unitStatus[status]}
    </span>
  );
}

export function Bar({ value, state, label }: { value: number; state?: "done" | "active" | "next"; label?: string }) {
  return (
    <div
      className={`bar ${state === "active" ? "is-active" : state === "done" ? "is-done" : ""}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      {value > 0 && <span style={{ width: `${value}%` }} />}
    </div>
  );
}
