import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const EditBuildingPage = lazy(() =>
  import("@/components/admin/EditBuildingPage").then((m) => ({ default: m.EditBuildingPage })),
);

function EditBuildingFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/buildings/$id/edit")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Edit building — Admin" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <Suspense fallback={<EditBuildingFallback />}>
      <EditBuildingPage id={id} />
    </Suspense>
  );
}
