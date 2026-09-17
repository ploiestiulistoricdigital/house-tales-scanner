import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const AntitezaPage = lazy(() =>
  import("@/components/admin/AntitezaPage").then((m) => ({ default: m.AntitezaPage })),
);

function AntitezaFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/antiteza")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Antiteza pairs — Admin" }] }),
  component: () => (
    <Suspense fallback={<AntitezaFallback />}>
      <AntitezaPage />
    </Suspense>
  ),
});
