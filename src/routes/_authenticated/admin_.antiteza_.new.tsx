import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const NewAntitezaPairPage = lazy(() =>
  import("@/components/admin/NewAntitezaPairPage").then((m) => ({ default: m.NewAntitezaPairPage })),
);

function NewAntitezaPairFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/antiteza_/new")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "New antiteza pair — Admin" }] }),
  component: () => (
    <Suspense fallback={<NewAntitezaPairFallback />}>
      <NewAntitezaPairPage />
    </Suspense>
  ),
});
