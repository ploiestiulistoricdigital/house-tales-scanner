import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { BuildingForm, type BuildingFormValues } from "@/components/BuildingForm";
import { createBuilding } from "@/lib/buildings.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin_/buildings/new")({
  head: () => ({ meta: [{ title: "New building — Admin" }] }),
  component: NewBuilding,
});

function NewBuilding() {
  const navigate = useNavigate();
  const create = useServerFn(createBuilding);
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(v: BuildingFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const row = await create({
        data: {
          slug: v.slug,
          name: v.name,
          address: v.address || null,
          year_built: v.year_built || null,
          architect: v.architect || null,
          short_description: v.short_description || null,
          history: v.history || null,
          cover_image_url: v.cover_image_url || null,
        },
      });
      navigate({ to: "/admin/buildings/$id/edit", params: { id: row.id } });
    } catch (e: any) {
      setError(e.message ?? t("form.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("form.newBuilding")}</h1>
        <BuildingForm
          initial={{
            slug: "",
            name: "",
            address: "",
            year_built: "",
            architect: "",
            short_description: "",
            history: "",
            cover_image_url: "",
          }}
          submitLabel={t("form.create")}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      </div>
    </div>
  );
}
