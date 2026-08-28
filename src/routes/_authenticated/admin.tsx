import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const AdminPage = lazy(() => import("@/components/admin/AdminPage").then((m) => ({ default: m.AdminPage })));

function AdminPageFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Administrare — Poveștile Caselor" }] }),
  component: () => (
    <Suspense fallback={<AdminPageFallback />}>
      <AdminPage />
    </Suspense>
  ),
});
