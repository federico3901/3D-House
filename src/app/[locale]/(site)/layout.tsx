import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { NoticeBar } from "@/components/layout/NoticeBar";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NoticeBar />
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
