import type { Metadata } from "next";
import { HomeView } from "@/components/home/HomeView";
import { tr } from "@/lib/format";
import { hasLocale } from "@/lib/locales";
import { alternates, jsonLd } from "@/lib/seo";
import { baseTenant } from "@/tenants";

export async function generateMetadata({ params }: PageProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternates(hasLocale(locale) ? locale : "it", "/") };
}

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  const { brand } = baseTenant;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@type": "HomeAndConstructionBusiness",
          name: brand.name,
          description: tr(brand.tagline, hasLocale(locale) ? locale : "it"),
          email: brand.email,
          telephone: brand.phone,
          address: { "@type": "PostalAddress", streetAddress: brand.address, addressCountry: "IT" },
          foundingDate: String(brand.foundedYear),
        })}
      />
      <HomeView />
    </>
  );
}
