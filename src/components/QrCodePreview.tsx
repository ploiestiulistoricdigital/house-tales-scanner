import { Download, FileImage, FileText } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { saveQrExport } from "@/lib/qr-exports.functions";
import { QrExportHistory } from "@/components/QrExportHistory";
import { useI18n } from "@/lib/i18n";

const PUBLIC_BASE = "https://house-tales-scanner.lovable.app";

export function QrCodePreview({ slug, buildingId }: { slug: string; buildingId?: string }) {
  const { t } = useI18n();
  const cleaned = slug.trim();
  const url = cleaned ? `${PUBLIC_BASE}/b/${cleaned}` : "";
  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(url)}`
    : "";
  const hiResSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&format=png&data=${encodeURIComponent(url)}`
    : "";
  const [busy, setBusy] = useState<null | "png" | "pdf">(null);
  const save = useServerFn(saveQrExport);
  const qc = useQueryClient();

  async function persist(format: "png" | "pdf", blob: Blob) {
    if (!buildingId) return;
    try {
      const base64 = await blobToBase64(blob);
      await save({ data: { building_id: buildingId, format, base64 } });
      qc.invalidateQueries({ queryKey: ["qr-exports", buildingId] });
    } catch (e) {
      console.error("Failed to save QR export", e);
    }
  }

  async function downloadPng() {
    if (!hiResSrc) return;
    setBusy("png");
    try {
      const res = await fetch(hiResSrc);
      const blob = await res.blob();
      triggerDownload(blob, `qr-${cleaned}.png`);
      await persist("png", blob);
    } finally {
      setBusy(null);
    }
  }

  async function downloadPdf() {
    if (!hiResSrc) return;
    setBusy("pdf");
    try {
      const [{ jsPDF }, dataUrl] = await Promise.all([
        import("jspdf"),
        fetchAsDataUrl(hiResSrc),
      ]);
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const size = 120;
      const x = (pageW - size) / 2;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text(t("qr.pdfTitle"), pageW / 2, 30, { align: "center" });
      pdf.addImage(dataUrl, "PNG", x, 45, size, size);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(url, pageW / 2, 45 + size + 12, { align: "center" });
      pdf.save(`qr-${cleaned}.pdf`);
      const blob = pdf.output("blob");
      await persist("pdf", blob);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <h2 className="text-lg font-semibold mb-2">{t("qr.title")}</h2>
      {cleaned ? (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <img
            src={qrSrc}
            alt={t("qr.altFor", { url })}
            className="h-40 w-40 rounded border bg-white"
          />
          <div className="flex-1 min-w-0 space-y-3">
            <p className="text-sm text-muted-foreground">{t("qr.hint")}</p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-base text-primary underline"
            >
              {url}
            </a>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadPng}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium min-h-11 hover:bg-primary/90 disabled:opacity-50"
              >
                <FileImage className="h-4 w-4" />
                {busy === "png" ? t("qr.downloading") : t("qr.downloadPng")}
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-md border border-primary text-primary px-4 py-2 text-base font-medium min-h-11 hover:bg-primary/10 disabled:opacity-50"
              >
                <FileText className="h-4 w-4" />
                {busy === "pdf" ? t("qr.generating") : t("qr.downloadPdf")}
              </button>
              <a
                href={hiResSrc}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-base font-medium min-h-11 hover:bg-muted"
              >
                <Download className="h-4 w-4" /> {t("qr.open")}
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              {buildingId ? t("qr.autoSave") : t("qr.afterSave")}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-base text-muted-foreground">{t("qr.needSlug")}</p>
      )}
      {buildingId && <QrExportHistory buildingId={buildingId} />}
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function fetchAsDataUrl(src: string): Promise<string> {
  const res = await fetch(src);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
  return dataUrl.split(",")[1] ?? "";
}
