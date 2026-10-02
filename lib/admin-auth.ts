import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";

// proxy.ts already gates /admin; this repeats the check where the data is
// read, so a page never renders customer data on the proxy's word alone.
// Every signed-in account is an admin, so public sign-ups must stay off in
// Supabase Auth.
export async function requireAdmin(path: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims || claims.is_anonymous) {
    redirect(`/auth/login?${new URLSearchParams({ next: path })}`);
  }
  return claims.email ?? "Signed in";
}
