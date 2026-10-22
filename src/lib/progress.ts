import type { Phase, Project } from "./types";

export type PhaseState = "done" | "active" | "next";

export const phaseState = (p: Phase): PhaseState => (p.progress >= 100 ? "done" : p.progress > 0 ? "active" : "next");

/** Weighted average of the phases, 0–100, rounded. */
export function overallProgress(project: Project): number {
  if (project.status === "completed") return 100;
  const total = project.phases.reduce((s, p) => s + p.weight, 0);
  if (!total) return 0;
  return Math.round(project.phases.reduce((s, p) => s + p.weight * clamp(p.progress), 0) / total);
}

/** The phase to point at: the first one not finished. */
export const currentPhase = (project: Project): Phase | undefined => project.phases.find((p) => p.progress < 100);

export const latestUpdate = (project: Project) => [...project.updates].sort((a, b) => b.date.localeCompare(a.date))[0];

export const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 0));
