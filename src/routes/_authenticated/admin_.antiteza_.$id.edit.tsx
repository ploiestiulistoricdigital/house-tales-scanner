import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const EditAntitezaPairPage = lazy(() =>
  import("@/components/admin/EditAntitezaPairPage").then((m) => ({ default: m.EditAntitezaPairPage })),
);

function EditAntitezaPairFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/antiteza_/$id/edit")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Edit antiteza pair — Admin" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <Suspense fallback={<EditAntitezaPairFallback />}>
      <EditAntitezaPairPage id={id} />
    </Suspense>
  );
}
