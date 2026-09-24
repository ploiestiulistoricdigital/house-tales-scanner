import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const EditTeamMemberPage = lazy(() =>
  import("@/components/admin/EditTeamMemberPage").then((m) => ({ default: m.EditTeamMemberPage })),
);

function EditTeamMemberFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/despre-proiect_/team/$id/edit")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Edit team member — Admin" }] }),
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return (
    <Suspense fallback={<EditTeamMemberFallback />}>
      <EditTeamMemberPage id={id} />
    </Suspense>
  );
}
