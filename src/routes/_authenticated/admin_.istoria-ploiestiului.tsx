import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const HeritagePage = lazy(() =>
  import("@/components/admin/HeritagePage").then((m) => ({ default: m.HeritagePage })),
);

function HeritageFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/istoria-ploiestiului")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Ploieștiul istoric — Admin" }] }),
  component: () => (
    <Suspense fallback={<HeritageFallback />}>
      <HeritagePage variant="istoria" />
    </Suspense>
  ),
});
