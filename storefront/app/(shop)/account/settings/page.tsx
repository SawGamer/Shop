import type { Metadata } from "next";
import { AccountNav } from "@/components/account/account-nav";
import { DeleteAccountForm } from "@/components/account/delete-account-form";
import { Container, Notice, PageTitle } from "@/components/ui";
import { isAdmin, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

export default async function AccountSettingsPage() {
  const user = await requireUser("/account/settings");
  return (
    <Container className="py-10">
      <PageTitle sub={`Signed in as ${user.email}`}>Your account</PageTitle>
      <AccountNav current="/account/settings" />

      <section aria-labelledby="danger" className="max-w-xl rounded-tag border-2 border-signal/40 bg-white p-6">
        <h2 id="danger" className="headline text-2xl text-signal">
          Delete your account
        </h2>
        <div className="mt-3 space-y-2 text-sm text-ink-soft">
          <p>This permanently erases:</p>
          <ul className="list-disc pl-5">
            <li>your name and email address</li>
            <li>your saved addresses</li>
            <li>your cart and your logins on every device</li>
          </ul>
          <p>
            Your past orders are <strong className="text-ink">kept</strong>: shops must retain them for tax and
            accounting. They stay linked to the email address you used when you ordered, but you can no longer log in to
            see them.
          </p>
        </div>
        <div className="mt-6 border-t border-mist pt-6">
          {isAdmin(user) ? (
            <Notice tone="info" title="Admin accounts can't be deleted here">
              Remove the admin role first, or ask another admin to do it. This protects the shop from being left without
              an administrator.
            </Notice>
          ) : (
            <DeleteAccountForm />
          )}
        </div>
      </section>
    </Container>
  );
}
