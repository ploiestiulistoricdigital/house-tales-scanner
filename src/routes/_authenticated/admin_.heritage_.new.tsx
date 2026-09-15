import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { useT } from "@/lib/i18n";

const NewHeritageItemPage = lazy(() =>
  import("@/components/admin/NewHeritageItemPage").then((m) => ({ default: m.NewHeritageItemPage })),
);

function NewHeritageItemFallback() {
  const t = useT();
  return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
}

export const Route = createFileRoute("/_authenticated/admin_/heritage_/new")({
  beforeLoad: () => requireAdminRoute(),
  head: () => ({ meta: [{ title: "New heritage item — Admin" }] }),
  component: () => (
    <Suspense fallback={<NewHeritageItemFallback />}>
      <NewHeritageItemPage />
    </Suspense>
  ),
});
