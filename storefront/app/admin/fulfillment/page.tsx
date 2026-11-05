import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminTitle } from "@/components/admin/bits";
import { FulfillmentAdmin } from "@/components/admin/fulfillment-admin";
import { ServiceDown } from "@/components/ui";
import { getAdminFulfillment } from "@/lib/fulfillment-data";
import type { AdminFulfillment } from "@/lib/types";

export const metadata: Metadata = { title: "Fulfillment" };

export default async function AdminFulfillmentPage() {
  await connection();
  let data: AdminFulfillment | null = null;
  try {
    data = await getAdminFulfillment();
  } catch {
    data = null;
  }
  return (
    <>
      <AdminTitle sub="Delivery areas, pickup stores and the slots customers can book.">Fulfillment</AdminTitle>
      {data ? <FulfillmentAdmin data={data} /> : <ServiceDown what="the fulfillment settings" />}
    </>
  );
}
