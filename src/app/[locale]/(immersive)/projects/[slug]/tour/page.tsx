import type { Metadata } from "next";
import { TourPage } from "@/components/tour/TourPage";
import { dictionaries } from "@/i18n/dictionaries";
import { hasLocale } from "@/lib/locales";
import { LOCALES } from "@/lib/types";
import { baseTenant } from "@/tenants";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    baseTenant.projects.filter((p) => p.tours.length > 0).map((p) => ({ locale, slug: p.slug })),
  );
}

export async function generateMetadata({ params }: PageProps<"/[locale]/projects/[slug]/tour">): Promise<Metadata> {
  const { locale, slug } = await params;
  const project = baseTenant.projects.find((p) => p.slug === slug);
  const t = dictionaries[hasLocale(locale) ? locale : "it"];
  return { title: project ? `${t.project.tour} · ${project.name}` : t.project.tour };
}

export default async function TourRoute({ params }: PageProps<"/[locale]/projects/[slug]/tour">) {
  const { slug } = await params;
  return <TourPage slug={slug} />;
}
