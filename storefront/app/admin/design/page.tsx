import type { Metadata } from "next";
import { connection } from "next/server";
import { DesignForm, type DesignOption } from "@/components/admin/design-form";
import { PageTitle, ServiceDown } from "@/components/ui";
import { getShopSettingsFresh } from "@/lib/shop";
import { THEME_IDS, THEMES } from "@/lib/themes";
import type { ShopSettings } from "@/lib/types";

export const metadata: Metadata = { title: "Design" };

export default async function DesignPage() {
  await connection();
  let settings: ShopSettings | null = null;
  try {
    settings = await getShopSettingsFresh();
  } catch {
    settings = null;
  }

  const options: DesignOption[] = THEME_IDS.map((id) => {
    const t = THEMES[id];
    return { id, name: t.name, description: t.description, preview: t.preview };
  });

  return (
    <div className="max-w-6xl">
      <PageTitle sub="Choose how the storefront looks. Visitors see the new design on their next page view.">Design</PageTitle>
      {settings ? <DesignForm settings={settings} options={options} /> : <ServiceDown what="the shop settings" />}
    </div>
  );
}
