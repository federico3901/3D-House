import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Saira_Condensed } from "next/font/google";
import { notFound } from "next/navigation";
import { Building3D } from "@/components/building3d/Building3D";
import { strings3d } from "@/components/building3d/strings";
import { hasLocale } from "@/lib/locales";
import { LOCALES } from "@/lib/types";
import { baseTenant } from "@/tenants";
import { plans } from "@/tenants/plans";

// The type of the Atlante delle Forniture, for this view only.
const saira = Saira_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-saira", display: "swap" });
const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });

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
  return { title: project ? `${s.tag} · ${project.name}` : s.tag };
}

export default async function Building3DRoute({ params }: PageProps<"/[locale]/projects/[slug]/3d">) {
  const { slug } = await params;
  const project = baseTenant.projects.find((p) => p.slug === slug);
  const plan = project?.building ? plans[project.building] : undefined;
  if (!project || !plan) notFound();
  return <Building3D plan={plan} slug={slug} fontClass={`${saira.variable} ${plex.variable} ${plexMono.variable}`} />;
}
