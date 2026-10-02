"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.replace("/auth/login");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={logout}>
      Sign out
    </Button>
  );
}
