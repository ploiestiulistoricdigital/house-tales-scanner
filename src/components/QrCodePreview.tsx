import { Download } from "lucide-react";

const PUBLIC_BASE = "https://house-tales-scanner.lovable.app";

export function QrCodePreview({ slug }: { slug: string }) {
  const cleaned = slug.trim();
  const url = cleaned ? `${PUBLIC_BASE}/b/${cleaned}` : "";
  const qrSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(url)}`
    : "";
  const downloadSrc = url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&format=png&data=${encodeURIComponent(url)}`
    : "";

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4">
      <h2 className="text-lg font-semibold mb-2">Cod QR</h2>
      {cleaned ? (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <img
            src={qrSrc}
            alt={`Cod QR pentru ${url}`}
            className="h-40 w-40 rounded border bg-white"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm text-muted-foreground">
              Se generează pe baza identificatorului URL. Scanează pentru a testa:
            </p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-base text-primary underline"
            >
              {url}
            </a>
            <a
              href={downloadSrc}
              download={`qr-${cleaned}.png`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium min-h-11 hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Descarcă PNG
            </a>
          </div>
        </div>
      ) : (
        <p className="text-base text-muted-foreground">
          Completează identificatorul URL pentru a genera codul QR.
        </p>
      )}
    </div>
  );
}
