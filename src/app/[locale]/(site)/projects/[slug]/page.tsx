import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AreaMap } from "@/components/map/AreaMap";
import { ProjectView } from "@/components/project/ProjectView";
import { tr } from "@/lib/format";
import { hasLocale } from "@/lib/locales";
import { LOCALES } from "@/lib/types";
import { baseTenant } from "@/tenants";
import { maps } from "@/tenants/maps";

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
  };
}

export default async function ProjectPage({ params }: PageProps<"/[locale]/projects/[slug]">) {
  const { locale, slug } = await params;
  const project = baseTenant.projects.find((p) => p.slug === slug);
  if (!project || !hasLocale(locale)) notFound();
  const map = project.map ? maps[project.map] : undefined;
  return (
    <ProjectView
      slug={slug}
      map={map && <AreaMap map={map} pinLabel={project.name} title={`${project.location.address}, ${project.location.city}`} />}
    />
  );
}
