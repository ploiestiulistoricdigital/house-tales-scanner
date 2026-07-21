import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin, deleteBuilding, claimFirstAdmin } from "@/lib/buildings.functions";
import { Plus, Pencil, Trash2, Copy, ExternalLink, LogOut } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administrare — Poveștile Caselor" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const checkAdmin = useServerFn(checkIsAdmin);
  const deleteFn = useServerFn(deleteBuilding);
  const claimAdmin = useServerFn(claimFirstAdmin);
  const [copied, setCopied] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
  });

  const { data: buildings } = useQuery({
    queryKey: ["admin-buildings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("id, slug, name, address, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: adminCheck?.isAdmin === true,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteFn({ data: { id: pendingDelete.id } });
    setPendingDelete(null);
    qc.invalidateQueries({ queryKey: ["admin-buildings"] });
    qc.invalidateQueries({ queryKey: ["buildings"] });
  }


  function copyUrl(slug: string) {
    const url = `${window.location.origin}/b/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  }

  if (checkingAdmin) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
  }

  if (!adminCheck?.isAdmin) {
    async function tryClaim() {
      setClaiming(true);
      try {
        const res = await claimAdmin();
        if (res.granted) {
          qc.invalidateQueries({ queryKey: ["is-admin"] });
        } else {
          alert(t("admin.claim.exists"));
        }
      } catch (e: any) {
        alert(e.message ?? t("admin.claim.failed"));
      } finally {
        setClaiming(false);
      }
    }
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="fixed top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("admin.unauthorized.title")}</h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            {t("admin.unauthorized.desc")}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={tryClaim}
              disabled={claiming}
              className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {claiming ? "…" : t("admin.claim")}
            </button>
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
          <h1 className="text-lg sm:text-xl font-semibold">{t("admin.title")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/"
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center"
            >
              {t("nav.viewSite")}
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
          <h2 className="text-xl sm:text-2xl font-semibold">{t("admin.all")}</h2>
          <Link
            to="/admin/buildings/new"
            className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {t("admin.new")}
          </Link>
        </div>

        {!buildings || buildings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-base text-muted-foreground leading-relaxed">
            {t("admin.empty")}
          </div>
        ) : (
          <div className="rounded-lg border border-border/70 overflow-x-auto">
            <table className="w-full min-w-[640px] text-base">
              <tbody>
                {buildings.map((b) => (
                  <tr key={b.id} className="border-t border-border/70">
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.address ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded">/b/{b.slug}</code>
                        <button
                          onClick={() => copyUrl(b.slug)}
                          className="p-2 hover:bg-accent rounded inline-flex items-center justify-center"
                          aria-label={t("admin.copyUrl")}
                          title={t("admin.copyUrl")}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        {copied === b.slug && (
                          <span className="text-sm text-green-600">{t("admin.copied")}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link
                          to="/b/$slug"
                          params={{ slug: b.slug }}
                          className="p-2 hover:bg-accent rounded inline-flex items-center justify-center"
                          aria-label={t("admin.viewPublic")}
                          title={t("admin.view")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/admin/buildings/$id/edit"
                          params={{ id: b.id }}
                          className="p-2 hover:bg-accent rounded inline-flex items-center justify-center"
                          aria-label={t("admin.editBuilding")}
                          title={t("admin.edit")}
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => onDelete(b.id, b.name)}
                          className="p-2 hover:bg-destructive/10 hover:text-destructive rounded inline-flex items-center justify-center"
                          aria-label={t("admin.deleteBuilding")}
                          title={t("admin.delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-8 text-sm text-muted-foreground leading-relaxed">{t("admin.hint")}</p>
      </div>
    </div>
  );
}
