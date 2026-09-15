import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const EditHeritageItemPage = lazy(() =>
  import("@/components/admin/EditHeritageItemPage").then((m) => ({ default: m.EditHeritageItemPage })),
);

function EditHeritageItemFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/heritage/$id/edit")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Edit heritage item — Admin" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <Suspense fallback={<EditHeritageItemFallback />}>
      <EditHeritageItemPage id={id} />
    </Suspense>
  );
}
