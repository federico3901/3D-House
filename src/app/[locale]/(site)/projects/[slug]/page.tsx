import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanPreview } from "@/components/building3d/PlanPreview";
import { Neighbourhood } from "@/components/map/Neighbourhood";
import { ProjectView } from "@/components/project/ProjectView";
import { buildingSun } from "@/lib/exposure";
import { tr } from "@/lib/format";
import { hasLocale } from "@/lib/locales";
import { alternates, jsonLd } from "@/lib/seo";
import { LOCALES } from "@/lib/types";
import { baseTenant } from "@/tenants";
import { maps } from "@/tenants/maps";
import { plans } from "@/tenants/plans";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => baseTenant.projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/projects/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = baseTenant.projects.find((p) => p.slug === slug);
  if (!project || !hasLocale(locale)) return {};
  return {
    title: `${project.name} · ${tr(project.subtitle, locale)}`,
    description: tr(project.summary, locale),
    alternates: alternates(locale, `/projects/${slug}/`),
    openGraph: { images: [project.cover.src] },
  };
}

export default async function ProjectPage({ params }: PageProps<"/[locale]/projects/[slug]">) {
  const { locale, slug } = await params;
  const project = baseTenant.projects.find((p) => p.slug === slug);
  if (!project || !hasLocale(locale)) notFound();
  const map = project.map ? maps[project.map] : undefined;
  const plan = project.building ? plans[project.building] : undefined;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@type": "ApartmentComplex",
          name: `${project.name} · ${tr(project.subtitle, locale)}`,
          description: tr(project.summary, locale),
          image: project.cover.src,
          numberOfAccommodationUnits: project.units.length,
          numberOfAvailableAccommodationUnits: project.units.filter((u) => u.status === "available").length,
          address: {
            "@type": "PostalAddress",
            streetAddress: project.location.address,
            addressLocality: project.location.city,
            addressRegion: "MI",
            addressCountry: "IT",
          },
          geo: { "@type": "GeoCoordinates", latitude: project.location.lat, longitude: project.location.lng },
        })}
      />
      <ProjectView
        slug={slug}
        map={map && <Neighbourhood map={map} pinLabel={project.name} title={`${project.location.address}, ${project.location.city}`} />}
        model={plan && <PlanPreview plan={plan} locale={locale} title={`${project.name}: ${tr(project.subtitle, locale)}`} />}
        sun={plan && buildingSun(plan, project.location.lat, project.location.lng)}
      />
    </>
  );
}
