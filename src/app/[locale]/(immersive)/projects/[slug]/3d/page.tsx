import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Building3D } from "@/components/building3d/Building3D";
import { strings3d } from "@/components/building3d/strings";
import { hasLocale } from "@/lib/locales";
import { alternates } from "@/lib/seo";
import { LOCALES } from "@/lib/types";
import { baseTenant } from "@/tenants";
import { plans } from "@/tenants/plans";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    baseTenant.projects.filter((p) => p.building && plans[p.building]).map((p) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({ params }: PageProps<"/[locale]/projects/[slug]/3d">): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = baseTenant.projects.find((p) => p.slug === slug);
  const s = strings3d[hasLocale(locale) ? locale : "it"];
  const lang = hasLocale(locale) ? locale : "it";
  return { title: project ? `${s.tag} · ${project.name}` : s.tag, alternates: alternates(lang, `/projects/${slug}/3d/`) };
}

export default async function Building3DRoute({ params }: PageProps<"/[locale]/projects/[slug]/3d">) {
  const { slug } = await params;
  const project = baseTenant.projects.find((p) => p.slug === slug);
  const plan = project?.building ? plans[project.building] : undefined;
  if (!project || !plan) notFound();
  return <Building3D plan={plan} slug={slug} />;
}
