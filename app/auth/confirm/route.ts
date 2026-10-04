import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

// Invite and password-reset emails link here with a token_hash. Verifying it
// sets the session cookie, then the user picks a password.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(searchParams.get("next"), "/auth/set-password", origin);

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  const login = new URL("/auth/login", origin);
  login.searchParams.set("error", "link");
  return NextResponse.redirect(login);
}
