import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AntitezaPairForm, type AntitezaPairFormValues } from "@/components/AntitezaPairForm";
import { updateAntitezaPair } from "@/lib/antiteza.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function EditAntitezaPairPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const update = useServerFn(updateAntitezaPair);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: pair, isLoading } = useQuery({
    queryKey: ["antiteza-pair", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("antiteza_pairs").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  async function onSubmit(v: AntitezaPairFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await update({
        data: {
          id,
          before_image_url: v.before_image_url,
          after_image_url: v.after_image_url,
          before_caption: v.before_caption || null,
          before_caption_en: v.before_caption_en || null,
          before_caption_fr: v.before_caption_fr || null,
          after_caption: v.after_caption || null,
          after_caption_en: v.after_caption_en || null,
          after_caption_fr: v.after_caption_fr || null,
          sort_order: v.sort_order,
        },
      });
      qc.invalidateQueries({ queryKey: ["antiteza-pair", id] });
      qc.invalidateQueries({ queryKey: ["admin-antiteza-pairs"] });
      navigate({ to: "/admin/antiteza" });
    } catch (e: any) {
      setError(e.message ?? t("form.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !pair) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            to="/admin/antiteza"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("antiteza.admin.edit")}</h1>
        <AntitezaPairForm
          initial={{
            before_image_url: pair.before_image_url,
            after_image_url: pair.after_image_url,
            before_caption: pair.before_caption ?? "",
            before_caption_en: pair.before_caption_en ?? "",
            before_caption_fr: pair.before_caption_fr ?? "",
            after_caption: pair.after_caption ?? "",
            after_caption_en: pair.after_caption_en ?? "",
            after_caption_fr: pair.after_caption_fr ?? "",
            sort_order: pair.sort_order,
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
