import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Route guard for the admin area: only users with the `admin` role may enter.
 * Runs client-side (the `_authenticated` layout is ssr:false), so the Supabase
 * bearer token is attached by the registered function middleware.
 */
export async function requireAdminRoute() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw redirect({ to: "/auth", search: { next: undefined } });
  }

  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (roleError || !role) throw redirect({ to: "/" });
  return { isAdmin: true as const };
}
