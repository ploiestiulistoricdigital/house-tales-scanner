import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AdminNav } from "@/components/admin/AdminNav";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth", search: { next: undefined } });
    return { user: data.user };
  },
  component: () => (
    <>
      <AdminNav />
      <Outlet />
    </>
  ),
});
