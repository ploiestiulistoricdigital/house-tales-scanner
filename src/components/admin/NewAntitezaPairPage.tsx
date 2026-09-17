import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { AntitezaPairForm, type AntitezaPairFormValues } from "@/components/AntitezaPairForm";
import { createAntitezaPair } from "@/lib/antiteza.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function NewAntitezaPairPage() {
  const navigate = useNavigate();
  const create = useServerFn(createAntitezaPair);
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(v: AntitezaPairFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const row = await create({
        data: {
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
      navigate({ to: "/admin/antiteza/$id/edit", params: { id: row.id } });
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
            to="/admin/antiteza"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("antiteza.admin.new")}</h1>
        <AntitezaPairForm
          initial={{
            before_image_url: "",
            after_image_url: "",
            before_caption: "",
            before_caption_en: "",
            before_caption_fr: "",
            after_caption: "",
            after_caption_en: "",
            after_caption_fr: "",
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
