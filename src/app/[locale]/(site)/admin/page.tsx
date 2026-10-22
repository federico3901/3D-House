import type { Metadata } from "next";
import { AdminApp } from "@/components/admin/AdminApp";
import { dictionaries } from "@/i18n/dictionaries";
import { hasLocale } from "@/lib/locales";

export async function generateMetadata({ params }: PageProps<"/[locale]/admin">): Promise<Metadata> {
  const { locale } = await params;
  return { title: dictionaries[hasLocale(locale) ? locale : "it"].admin.title, robots: { index: false } };
}

export default function AdminPage() {
  return <AdminApp />;
}
