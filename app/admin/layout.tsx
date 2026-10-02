import { LogoutButton } from "@/components/logout-button";
import { requireAdmin } from "@/lib/admin-auth";

import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const email = await requireAdmin("/admin");

  return (
    <div className="admin-surface dark flex flex-1 flex-col bg-ink text-white/70">
      <div className="border-b border-white/12">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-8">
          <div className="flex items-center gap-8">
            <p className="font-heading hidden text-[11px] tracking-[0.42em] text-white/50 lg:block">
              Carnaval of Screams
            </p>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-white/45 sm:inline">{email}</span>
            <LogoutButton />
          </div>
        </div>
      </div>
      <main className="flex-1 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
