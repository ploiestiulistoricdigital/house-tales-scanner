import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, Trash2, FileImage, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteQrExport } from "@/lib/qr-exports.functions";
import { useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function QrExportHistory({ buildingId }: { buildingId: string }) {
  const qc = useQueryClient();
  const del = useServerFn(deleteQrExport);
  const { t, locale } = useI18n();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data: exports, isLoading } = useQuery({
    queryKey: ["qr-exports", buildingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_code_exports")
        .select("id, format, created_at, file_size, file_url")
        .eq("building_id", buildingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function confirmDelete() {
    if (!pendingDelete) return;
    await del({ data: { id: pendingDelete } });
    setPendingDelete(null);
    qc.invalidateQueries({ queryKey: ["qr-exports", buildingId] });
  }


  return (
    <div className="mt-4 rounded-md border border-border/70 bg-muted/30 p-3">
      <h3 className="text-base font-semibold mb-2">{t("qr.history")}</h3>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("qr.history.loading")}</p>
      ) : exports && exports.length > 0 ? (
        <ul className="space-y-2">
          {exports.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded border border-border/70 bg-background p-2"
            >
              {e.format === "pdf" ? (
                <FileText className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <FileImage className="h-5 w-5 text-primary shrink-0" />
              )}
              <div className="flex-1 min-w-0 text-sm">
                <div className="font-medium uppercase">{e.format}</div>
                <div className="text-muted-foreground">
                  {new Date(e.created_at).toLocaleString(locale)}
                  {e.file_size ? ` · ${Math.round(e.file_size / 1024)} KB` : ""}
                </div>
              </div>
              <a
                href={e.file_url}
                target="_blank"
                rel="noreferrer"
                download
                className="p-2 rounded hover:bg-muted inline-flex items-center justify-center"
                aria-label={t("qr.history.download")}
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                type="button"
                onClick={() => setPendingDelete(e.id)}
                className="p-2 rounded hover:bg-destructive/10 hover:text-destructive inline-flex items-center justify-center"
                aria-label={t("qr.history.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{t("qr.history.empty")}</p>
      )}
      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("qr.history.confirmDelete.title")}
        description={t("qr.history.confirmDelete")}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
