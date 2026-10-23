import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prepareBuilding } from "@/components/building3d/plan";
import { strings3d } from "@/components/building3d/strings";
import { UnitPlan } from "@/components/project/UnitPlan";
import { UnitSheet, type SheetRoom } from "@/components/project/UnitSheet";
import { unitSun } from "@/lib/exposure";
import { tr } from "@/lib/format";
import { dictionaries } from "@/i18n/dictionaries";
import { hasLocale } from "@/lib/locales";
import { alternates } from "@/lib/seo";
import { LOCALES } from "@/lib/types";
import { baseTenant } from "@/tenants";
import { maps, nearestByCategory } from "@/tenants/maps";
import { plans } from "@/tenants/plans";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => baseTenant.projects.flatMap((p) => p.units.map((u) => ({ locale, slug: p.slug, unit: u.id }))));
}

function find(slug: string, unitId: string) {
  const project = baseTenant.projects.find((p) => p.slug === slug);
  const unit = project?.units.find((u) => u.id === unitId);
  return project && unit ? { project, unit } : null;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/projects/[slug]/units/[unit]">): Promise<Metadata> {
  const { locale, slug, unit: unitId } = await params;
  const found = find(slug, unitId);
  if (!found || !hasLocale(locale)) return {};
  const { project, unit } = found;
  const t = dictionaries[locale];
  return {
    title: `${unit.name} · ${t.rooms(unit.rooms)} ${unit.area} m² · ${project.name}`,
    description: `${t.sheet.title}: ${t.rooms(unit.rooms)}, ${unit.area} m², ${project.location.address}, ${project.location.city}. ${tr(project.summary, locale)}`,
    alternates: alternates(locale, `/projects/${slug}/units/${unitId}/`),
  };
}

export default async function UnitPage({ params }: PageProps<"/[locale]/projects/[slug]/units/[unit]">) {
  const { locale, slug, unit: unitId } = await params;
  const found = find(slug, unitId);
  if (!found || !hasLocale(locale)) notFound();
  const { project, unit } = found;
  const plan = project.building ? plans[project.building] : undefined;
  const map = project.map ? maps[project.map] : undefined;
  const s = strings3d[locale];

  // The apartment's rooms from the plan, the largest first, outdoor spaces last.
  const rooms: SheetRoom[] = plan
    ? prepareBuilding(plan)
        .floors.flatMap((f) => f.rooms.filter((r) => r.unitId === unit.id))
        .map((r) => ({ id: r.id, name: r.name ? tr(r.name, locale) : s.kinds[r.kind], area: r.area, outdoor: r.outdoor }))
        .sort((a, b) => Number(a.outdoor) - Number(b.outdoor) || b.area - a.area)
    : [];

  return (
    <UnitSheet
      slug={slug}
      unitId={unit.id}
      plan={plan && <UnitPlan plan={plan} unitId={unit.id} locale={locale} title={`${project.name}, ${unit.name}`} />}
      rooms={rooms}
      sun={(plan && unitSun(plan, unit.id, project.location.lat, project.location.lng)) ?? undefined}
      services={map ? nearestByCategory(map.services) : []}
      has3d={!!plan}
    />
  );
}
