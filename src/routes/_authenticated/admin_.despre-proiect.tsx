import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const AboutPage = lazy(() =>
  import("@/components/admin/AboutPage").then((m) => ({ default: m.AboutPage })),
);

function AboutFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/despre-proiect")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "Despre proiect — Admin" }] }),
  component: () => (
    <Suspense fallback={<AboutFallback />}>
      <AboutPage />
    </Suspense>
  ),
});
