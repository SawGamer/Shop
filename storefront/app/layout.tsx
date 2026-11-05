import type { Metadata, Viewport } from "next";
// Fonts for every design. Each is only downloaded by browsers when its design is active.
import "@fontsource-variable/archivo/wdth.css";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/nunito";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";
import "@fontsource-variable/jost";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "./globals.css";
import { getShop } from "@/lib/shop";

export async function generateMetadata(): Promise<Metadata> {
  const { settings, theme } = await getShop();
  return {
    title: { default: settings.tagline ? `${settings.name} — ${settings.tagline}` : settings.name, template: `%s · ${settings.name}` },
    description: settings.tagline ?? theme.copy.metaDescription,
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { theme } = await getShop();
  return { themeColor: theme.themeColor };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme, accent } = await getShop();
  // A custom accent colour from the Design page overrides the design's own accent.
  const style = accent
    ? ({
        "--color-cobalt": accent,
        "--color-cobalt-deep": `color-mix(in srgb, ${accent} 80%, black)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <html lang="en" data-theme={theme.id} style={style}>
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
