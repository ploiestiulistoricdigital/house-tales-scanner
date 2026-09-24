import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const NewTeamMemberPage = lazy(() =>
  import("@/components/admin/NewTeamMemberPage").then((m) => ({ default: m.NewTeamMemberPage })),
);

function NewTeamMemberFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/despre-proiect_/team/new")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "New team member — Admin" }] }),
  component: () => (
    <Suspense fallback={<NewTeamMemberFallback />}>
      <NewTeamMemberPage />
    </Suspense>
  ),
});
