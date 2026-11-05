import type { Metadata } from "next";
import { AccountNav } from "@/components/account/account-nav";
import { AddressesManager } from "@/components/account/addresses-manager";
import { Container, PageTitle, ServiceDown } from "@/components/ui";
import { getMyAddresses } from "@/lib/addresses-data";
import { requireUser } from "@/lib/auth";
import type { SavedAddress } from "@/lib/types";

export const metadata: Metadata = { title: "Your addresses", robots: { index: false } };

export default async function AddressesPage() {
  await requireUser("/account/addresses");
  let addresses: SavedAddress[] | null = null;
  try {
    addresses = await getMyAddresses();
  } catch {
    addresses = null;
  }
  return (
    <Container className="py-10">
      <PageTitle sub="Saved addresses are filled in for you at checkout.">Your account</PageTitle>
      <AccountNav current="/account/addresses" />
      {addresses ? <AddressesManager addresses={addresses} /> : <ServiceDown what="your addresses" />}
    </Container>
  );
}
