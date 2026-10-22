import type { BuildingPlan } from "@/lib/types";
import { grazioli57 } from "./demo/plans/grazioli-57";

/* Building plans by id (Project.building). They are only loaded by the pages that draw them. */
export const plans: Record<string, BuildingPlan> = {
  [grazioli57.id]: grazioli57,
};
