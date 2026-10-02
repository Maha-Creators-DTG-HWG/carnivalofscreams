import type { Metadata } from "next";

import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="admin-surface dark relative isolate flex flex-1 items-center justify-center bg-ink px-4 py-16">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(70,100,150,0.18),transparent_60%)]"
      />
      <div className="flex w-full max-w-sm flex-col gap-10">
        <div className="text-center">
          <p className="font-heading text-[11px] tracking-[0.42em] text-white/50">
            Carnaval of Screams
          </p>
          <h1 className="font-heading mt-4 text-3xl tracking-[0.14em] text-white">Admin</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
