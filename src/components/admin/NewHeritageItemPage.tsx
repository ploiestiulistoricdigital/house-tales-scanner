import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { HeritageItemForm, type HeritageItemFormValues } from "@/components/HeritageItemForm";
import { createHeritageItem } from "@/lib/heritage-items.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function NewHeritageItemPage() {
  const navigate = useNavigate();
  const create = useServerFn(createHeritageItem);
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(v: HeritageItemFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const row = await create({
        data: {
          category: v.category,
          slug: v.slug,
          title: v.title,
          title_en: v.title_en || null,
          title_fr: v.title_fr || null,
          description: v.description || null,
          description_en: v.description_en || null,
          description_fr: v.description_fr || null,
          image_url: v.image_url || null,
          sort_order: v.sort_order,
        },
      });
      navigate({ to: "/admin/heritage/$id/edit", params: { id: row.id } });
    } catch (e: any) {
      setError(e.message ?? t("form.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            to="/admin/heritage"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("heritageItems.admin.new")}</h1>
        <HeritageItemForm
          initial={{
            category: "locuri_disparute",
            slug: "",
            title: "",
            title_en: "",
            title_fr: "",
            description: "",
            description_en: "",
            description_fr: "",
            image_url: "",
            sort_order: 0,
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
