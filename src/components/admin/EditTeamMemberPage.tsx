import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TeamMemberForm, type TeamMemberFormValues } from "@/components/TeamMemberForm";
import { updateTeamMember } from "@/lib/about.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export function EditTeamMemberPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const update = useServerFn(updateTeamMember);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: member, isLoading } = useQuery({
    queryKey: ["team-member", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  async function onSubmit(v: TeamMemberFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await update({
        data: {
          id,
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
      qc.invalidateQueries({ queryKey: ["team-member", id] });
      qc.invalidateQueries({ queryKey: ["admin-team-members"] });
      navigate({ to: "/admin/despre-proiect" });
    } catch (e: any) {
      setError(e.message ?? t("form.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !member) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
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
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("about.admin.editMember")}</h1>
        <TeamMemberForm
          initial={{
            name: member.name,
            name_en: member.name_en ?? "",
            name_fr: member.name_fr ?? "",
            role: member.role ?? "",
            role_en: member.role_en ?? "",
            role_fr: member.role_fr ?? "",
            photo_url: member.photo_url ?? "",
            sort_order: member.sort_order,
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
