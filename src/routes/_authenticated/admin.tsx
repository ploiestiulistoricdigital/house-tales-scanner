import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin, deleteBuilding, claimFirstAdmin } from "@/lib/buildings.functions";
import { Plus, Pencil, Trash2, Copy, ExternalLink, LogOut, FileDown } from "lucide-react";
import { useState } from "react";
import { requireAdminRoute } from "@/lib/admin-guard";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";
import { PUBLIC_SITE_URL } from "@/lib/site-url";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: () => requireAdminRoute(),
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
  const [exporting, setExporting] = useState(false);

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      // Client-side role check: works on static/edge deployments where the
      // authenticated server function may not receive the bearer token.
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
      // Fallback to the server function (may resolve roles the client can't read).
      try {
        return await checkAdmin();
      } catch {
        return { isAdmin: false };
      }
    },
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
    navigate({ to: "/auth", search: { next: undefined }, replace: true });
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

  async function exportListPdf() {
    if (!buildings || buildings.length === 0) return;
    setExporting(true);
    try {
      const { jsPDF } = await import("jspdf");

      // Load a Unicode font (Noto Sans) so Romanian diacritics render correctly.
      const fontUrls = {
        normal:
          "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
        bold: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Bold.ttf",
      };
      const toBase64 = async (url: string) => {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buf);
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, i + chunk)),
          );
        }
        return btoa(binary);
      };

      const [fontNormal, fontBold, qrDataUrls] = await Promise.all([
        toBase64(fontUrls.normal),
        toBase64(fontUrls.bold),
        Promise.all(
          buildings.map(async (b) => {
            const src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&format=png&data=${encodeURIComponent(
              `${PUBLIC_SITE_URL}/b/${b.slug}`,
            )}`;
            const res = await fetch(src);
            const blob = await res.blob();
            return await new Promise<string>((resolve, reject) => {
              const r = new FileReader();
              r.onload = () => resolve(r.result as string);
              r.onerror = reject;
              r.readAsDataURL(blob);
            });
          }),
        ),
      ]);

      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      pdf.addFileToVFS("NotoSans-Regular.ttf", fontNormal);
      pdf.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
      pdf.addFileToVFS("NotoSans-Bold.ttf", fontBold);
      pdf.addFont("NotoSans-Bold.ttf", "NotoSans", "bold");
      pdf.setFont("NotoSans", "normal");

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const marginX = 15;
      const marginTop = 22;
      const marginBottom = 15;
      const colName = 65;
      const colAddr = 80;
      const colQr = 35;
      const rowH = 30;
      const qrSize = 24;
      const lineH = 4;

      const drawHeader = () => {
        pdf.setFont("NotoSans", "bold");
        pdf.setFontSize(13);
        pdf.text("Poveștile Caselor — Listă clădiri", pageW / 2, 12, { align: "center" });
        pdf.setFontSize(9);
        let x = marginX;
        const y = marginTop - 4;
        pdf.text("Denumire", x + 1, y);
        x += colName;
        pdf.text("Adresă", x + 1, y);
        x += colAddr;
        pdf.text("Cod QR", x + colQr / 2, y, { align: "center" });
        pdf.setLineWidth(0.2);
        pdf.line(marginX, marginTop - 2, pageW - marginX, marginTop - 2);
        pdf.setFont("NotoSans", "normal");
      };

      drawHeader();
      let y = marginTop + 2;
      pdf.setFontSize(9);

      buildings.forEach((b, i) => {
        if (y + rowH > pageH - marginBottom) {
          pdf.addPage();
          drawHeader();
          y = marginTop + 2;
          pdf.setFontSize(9);
        }
        const rowTop = y;
        const centerY = rowTop + rowH / 2;

        const nameLines = pdf.splitTextToSize(b.name ?? "", colName - 4) as string[];
        const addrLines = pdf.splitTextToSize(b.address ?? "—", colAddr - 4) as string[];

        pdf.setFont("NotoSans", "bold");
        const nameH = nameLines.length * lineH;
        pdf.text(nameLines, marginX + 1, centerY - nameH / 2 + 3);
        pdf.setFont("NotoSans", "normal");
        const addrH = addrLines.length * lineH;
        pdf.text(addrLines, marginX + colName + 1, centerY - addrH / 2 + 3);

        const qrX = marginX + colName + colAddr + (colQr - qrSize) / 2;
        const qrY = rowTop + (rowH - qrSize) / 2;
        try {
          pdf.addImage(qrDataUrls[i], "PNG", qrX, qrY, qrSize, qrSize);
        } catch {}

        y += rowH;
        pdf.setDrawColor(200);
        pdf.line(marginX, y, pageW - marginX, y);
        pdf.setDrawColor(0);
      });

      pdf.save(`lista-cladiri-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e: any) {
      toast.error(e?.message ?? "Export eșuat");
    } finally {
      setExporting(false);
    }
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
          toast.error(t("admin.claim.exists"));
        }
      } catch (e: any) {
        toast.error(e.message ?? t("admin.claim.failed"));
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportListPdf}
              disabled={exporting || !buildings || buildings.length === 0}
              className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md border border-primary text-primary px-4 py-2 text-base font-medium hover:bg-primary/10 disabled:opacity-50"
            >
              <FileDown className="h-4 w-4" />
              {exporting ? "Se generează…" : "Export PDF"}
            </button>
            <Link
              to="/admin/buildings/new"
              className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> {t("admin.new")}
            </Link>
          </div>
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
                          onClick={() => setPendingDelete({ id: b.id, name: b.name })}
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

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("admin.confirmDelete.title")}
        description={
          pendingDelete
            ? t("admin.confirmDelete", { name: pendingDelete.name })
            : undefined
        }
        confirmLabel={t("common.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
