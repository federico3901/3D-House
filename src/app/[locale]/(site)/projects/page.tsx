import type { Metadata } from "next";
import { ProjectsIndex } from "@/components/project/ProjectsIndex";
import { dictionaries } from "@/i18n/dictionaries";
import { hasLocale } from "@/lib/locales";

export async function generateMetadata({ params }: PageProps<"/[locale]/projects">): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[hasLocale(locale) ? locale : "it"].projects.title };
}

export default function ProjectsPage() {
  return <ProjectsIndex />;
}
