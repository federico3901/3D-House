import { baseTenant } from "@/tenants";

export const metadata = { title: baseTenant.brand.name, icons: { icon: "/icon.svg" } };

export default function GateLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body style={{ margin: 0, background: "#e8ebe7", color: "#121514", fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
