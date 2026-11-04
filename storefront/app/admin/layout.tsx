import type { Metadata } from "next";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { logout } from "@/lib/actions/auth";
import { requireAdminPage } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Z&A admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage("/admin");

  if (!admin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-20">
        <h1 className="headline text-4xl">Admins only</h1>
        <p className="mt-3 text-ink-soft">
          Your account doesn&apos;t have access to the admin area. Log in with an admin account to manage the shop.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/" className="btn btn-ink">
            Back to the shop
          </Link>
          <form action={logout}>
            <button type="submit" className="btn btn-quiet">
              Log out
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="bg-ink text-paper lg:sticky lg:top-0 lg:h-dvh lg:w-56 lg:shrink-0">
        <div className="flex items-center justify-between px-4 py-4 lg:block lg:px-5 lg:py-6">
          <Link href="/admin" className="headline text-[1.75rem] leading-none">
            Z&amp;A <span className="font-normal text-paper/60">admin</span>
          </Link>
          <Link href="/" className="text-sm text-paper/70 hover:text-paper lg:mt-2 lg:block">
            View shop
          </Link>
        </div>
        <div className="px-3 pb-3 lg:px-3">
          <AdminNav />
        </div>
        <div className="hidden px-5 py-6 text-sm text-paper/60 lg:absolute lg:bottom-0 lg:block">
          <p className="truncate">{admin.email}</p>
          <form action={logout} className="mt-2">
            <button type="submit" className="hover:text-paper">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
