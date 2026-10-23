import type { Metadata } from "next";
import { ProjectsIndex } from "@/components/project/ProjectsIndex";
import { dictionaries } from "@/i18n/dictionaries";
import { hasLocale } from "@/lib/locales";
import { alternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const { locale } = await params;
  const lang = hasLocale(locale) ? locale : "it";
  return { title: dictionaries[lang].projects.title, description: dictionaries[lang].projects.lead, alternates: alternates(lang, "/projects/") };
}

export default function ProjectsPage() {
  return <ProjectsIndex />;
}
