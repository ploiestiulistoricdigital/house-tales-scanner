import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AboutContentForm, type AboutContentFormValues } from "@/components/AboutContentForm";
import { updateIstoriaContent } from "@/lib/istoria.functions";
import { useI18n } from "@/lib/i18n";

export function IstoriaContentSection() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const update = useServerFn(updateIstoriaContent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: content } = useQuery({
    queryKey: ["admin-istoria-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("istoria_content").select("*").eq("id", 1).single();
      if (error) throw error;
      const { data: imgs, error: imgError } = await supabase
        .from("istoria_content_images")
        .select("image_url")
        .order("sort_order")
        .order("created_at");
      if (imgError) throw imgError;
      return { ...data, images: imgs.map((i) => i.image_url) };
    },
  });

  async function handleSubmit(v: AboutContentFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await update({ data: v });
      toast.success(t("istoria.admin.saved"));
      qc.invalidateQueries({ queryKey: ["admin-istoria-content"] });
    } catch (e: any) {
      setError(e.message ?? t("form.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mb-12">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4">{t("istoria.admin.articleSection")}</h2>
      {content && (
        <AboutContentForm
          withImages
          initial={{
            title: content.title,
            title_en: content.title_en ?? "",
            title_fr: content.title_fr ?? "",
            description: content.description,
            description_en: content.description_en ?? "",
            description_fr: content.description_fr ?? "",
            images: content.images,
          }}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={error}
        />
      )}
    </section>
  );
}
