import { isRedirect, redirect } from "@tanstack/react-router";
import { checkIsAdmin } from "@/lib/buildings.functions";

/**
 * Route guard for the admin area: only users with the `admin` role may enter.
 * Runs client-side (the `_authenticated` layout is ssr:false), so the Supabase
 * bearer token is attached by the registered function middleware.
 */
export async function requireAdminRoute() {
  try {
    const res = await checkIsAdmin();
    if (!res?.isAdmin) {
      throw redirect({ to: "/auth", search: { next: undefined } });
    }
    return { isAdmin: true as const };
  } catch (error) {
    if (isRedirect(error)) throw error;
    throw redirect({ to: "/auth", search: { next: undefined } });
  }
}
