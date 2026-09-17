import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/buildings.functions";
import { deleteAntitezaPair } from "@/lib/antiteza.functions";
import { Plus, Pencil, Trash2, LogOut } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function AntitezaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const checkAdmin = useServerFn(checkIsAdmin);
  const deleteFn = useServerFn(deleteAntitezaPair);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return { isAdmin: false };
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      if (data) return { isAdmin: true };
      try {
        return await checkAdmin();
      } catch {
        return { isAdmin: false };
      }
    },
  });

  const { data: pairs, isError: pairsError } = useQuery({
    queryKey: ["admin-antiteza-pairs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("antiteza_pairs")
        .select("id, before_image_url, after_image_url, before_caption, after_caption, sort_order")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: adminCheck?.isAdmin === true,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined }, replace: true });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteFn({ data: { id: pendingDelete } });
    setPendingDelete(null);
    qc.invalidateQueries({ queryKey: ["admin-antiteza-pairs"] });
  }

  if (checkingAdmin) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="fixed top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("admin.unauthorized.title")}</h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">{t("admin.unauthorized.desc")}</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md border px-4 py-2 text-base hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> {t("nav.signOut")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg sm:text-xl font-semibold">{t("antiteza.admin.title")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/admin"
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center"
            >
              {t("admin.all")}
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 min-h-11 rounded-md border px-3 py-2 text-sm sm:text-base hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> {t("nav.signOut")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold">{t("antiteza.admin.all")}</h2>
          <Link
            to="/admin/antiteza/new"
            className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {t("antiteza.admin.new")}
          </Link>
        </div>

        {pairsError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center text-base text-destructive leading-relaxed">
            {t("admin.error")}
          </div>
        ) : !pairs || pairs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-base text-muted-foreground leading-relaxed">
            {t("antiteza.admin.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {pairs.map((pair) => (
              <div key={pair.id} className="flex items-center gap-3 rounded-lg border border-border/70 p-3">
                <img src={pair.before_image_url} alt="" className="h-16 w-16 rounded object-cover bg-muted shrink-0" />
                <img src={pair.after_image_url} alt="" className="h-16 w-16 rounded object-cover bg-muted shrink-0" />
                <div className="flex-1 min-w-0 text-sm text-muted-foreground truncate">
                  {pair.before_caption || pair.after_caption || "—"}
                </div>
                <span className="text-sm text-muted-foreground shrink-0">#{pair.sort_order}</span>
                <div className="flex gap-1 shrink-0">
                  <Link
                    to="/admin/antiteza/$id/edit"
                    params={{ id: pair.id }}
                    className="p-2 hover:bg-accent rounded inline-flex items-center justify-center"
                    aria-label={t("admin.edit")}
                    title={t("admin.edit")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setPendingDelete(pair.id)}
                    className="p-2 hover:bg-destructive/10 hover:text-destructive rounded inline-flex items-center justify-center"
                    aria-label={t("admin.delete")}
                    title={t("admin.delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("antiteza.admin.confirmDelete.title")}
        description={t("antiteza.admin.confirmDelete")}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
