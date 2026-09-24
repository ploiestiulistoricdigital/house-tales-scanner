import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { TeamMemberForm, type TeamMemberFormValues } from "@/components/TeamMemberForm";
import { createTeamMember } from "@/lib/about.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function NewTeamMemberPage() {
  const navigate = useNavigate();
  const create = useServerFn(createTeamMember);
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(v: TeamMemberFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      const row = await create({
        data: {
          name: v.name,
          name_en: v.name_en || null,
          name_fr: v.name_fr || null,
          role: v.role || null,
          role_en: v.role_en || null,
          role_fr: v.role_fr || null,
          photo_url: v.photo_url || null,
          sort_order: v.sort_order,
        },
      });
      navigate({ to: "/admin/despre-proiect/team/$id/edit", params: { id: row.id } });
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
            to="/admin/despre-proiect"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("about.admin.addMember")}</h1>
        <TeamMemberForm
          initial={{ name: "", name_en: "", name_fr: "", role: "", role_en: "", role_fr: "", photo_url: "", sort_order: 0 }}
          submitLabel={t("form.create")}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />
      </div>
    </div>
  );
}
