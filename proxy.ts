import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Refreshes the Supabase session and keeps /admin to signed-in admins.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*"],
};
