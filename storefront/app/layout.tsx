import type { Metadata, Viewport } from "next";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Z&A — Shoes", template: "%s · Z&A" },
  description: "Running shoes, sneakers and boots from Z&A.",
};

export const viewport: Viewport = {
  themeColor: "#17203b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
