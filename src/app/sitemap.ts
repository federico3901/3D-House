import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { LOCALES } from "@/lib/types";
import { baseTenant } from "@/tenants";
import { plans } from "@/tenants/plans";

export const dynamic = "force-static";

/** Every public page in both languages, with its language versions. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/projects/",
    ...baseTenant.projects.flatMap((p) => [
      `/projects/${p.slug}/`,
      ...(p.tours.length ? [`/projects/${p.slug}/tour/`] : []),
      ...(p.building && plans[p.building] ? [`/projects/${p.slug}/3d/`] : []),
      ...p.units.map((u) => `/projects/${p.slug}/units/${u.id}/`),
    ]),
  ];
  return paths.map((path) => ({
    url: `${SITE_URL}/it${path}`,
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
  }));
}
