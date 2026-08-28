import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const NewBuildingPage = lazy(() =>
  import("@/components/admin/NewBuildingPage").then((m) => ({ default: m.NewBuildingPage })),
);

function NewBuildingFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/buildings/new")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "New building — Admin" }] }),
  component: () => (
    <Suspense fallback={<NewBuildingFallback />}>
      <NewBuildingPage />
    </Suspense>
  ),
});
