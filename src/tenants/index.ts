import type { TenantData } from "@/lib/types";
import demo from "./demo";

/* One build serves one impresa: TENANT=<id> at build time picks its folder (default "demo"). To add an impresa, copy
   src/tenants/demo/, edit index.ts and the media, and register it here. */
const tenants: Record<string, TenantData> = { demo };

export const baseTenant: TenantData = tenants[process.env.NEXT_PUBLIC_TENANT ?? "demo"] ?? demo;
