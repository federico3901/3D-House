import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { BrandStyle } from "@/components/layout/BrandStyle";
import { tr } from "@/lib/format";
import { LocaleProvider } from "@/lib/locale";
import { hasLocale } from "@/lib/locales";
import { SITE_URL } from "@/lib/seo";
import { LOCALES } from "@/lib/types";
import { baseTenant } from "@/tenants";
import "../globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", axes: ["wdth"], display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const lang = hasLocale(locale) ? locale : "it";
  const { brand } = baseTenant;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: brand.name, template: `%s · ${brand.name}` },
    description: tr(brand.tagline, lang),
    icons: { icon: "/icon.svg" },
    openGraph: { siteName: brand.name, type: "website", locale: lang === "it" ? "it_IT" : "en_GB", images: ["/media/hero-gru.jpg"] },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#e8ebe7",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${archivo.variable} ${instrument.variable} ${jetbrains.variable}`}>
      <body>
        <LocaleProvider locale={locale}>
          <BrandStyle />
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}
