import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HeritageItemForm, type HeritageItemFormValues } from "@/components/HeritageItemForm";
import { updateHeritageItem } from "@/lib/heritage-items.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function EditHeritageItemPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const update = useServerFn(updateHeritageItem);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: item, isLoading } = useQuery({
    queryKey: ["heritage-item", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("heritage_items").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  async function onSubmit(v: HeritageItemFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await update({
        data: {
          id,
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
      qc.invalidateQueries({ queryKey: ["heritage-item", id] });
      qc.invalidateQueries({ queryKey: ["admin-heritage-items"] });
      navigate({ to: "/admin/heritage" });
    } catch (e: any) {
      setError(e.message ?? t("form.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !item) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
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
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("heritageItems.admin.edit")}</h1>
        <HeritageItemForm
          initial={{
            category: item.category,
            slug: item.slug,
            title: item.title,
            title_en: item.title_en ?? "",
            title_fr: item.title_fr ?? "",
            description: item.description ?? "",
            description_en: item.description_en ?? "",
            description_fr: item.description_fr ?? "",
            image_url: item.image_url ?? "",
            sort_order: item.sort_order,
          }}
          submitLabel={t("form.save")}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      </div>
    </div>
  );
}
