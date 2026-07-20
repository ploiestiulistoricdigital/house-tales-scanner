import { useRef, useState } from "react";
import { Upload, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
const ALLOWED_EXTS = ["png", "jpg", "jpeg", "webp", "gif"] as const;
const ALLOWED_LABEL = "PNG, JPG, WEBP sau GIF";
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageUploader({
  onUploaded,
  label = "Încarcă imagine",
}: {
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const typeOk = (ALLOWED_TYPES as readonly string[]).includes(file.type);
    const extOk = (ALLOWED_EXTS as readonly string[]).includes(ext);
    if (!typeOk || !extOk) {
      return `Format neacceptat${file.type ? ` (${file.type})` : ""}. Sunt permise doar ${ALLOWED_LABEL}.`;
    }
    if (file.size === 0) return "Fișierul este gol.";
    if (file.size > MAX_BYTES) {
      return `Imaginea este prea mare (${formatBytes(file.size)}). Dimensiunea maximă este ${MAX_MB} MB.`;
    }
    return null;
  }

  async function handleFile(file: File) {
    setError(null);
    const err = validate(file);
    if (err) {
      setError(err);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("building-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("building-images").getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (e: any) {
      setError(e?.message ?? "Încărcarea a eșuat. Încearcă din nou.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="mt-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 min-h-11 rounded-md border border-border/70 bg-background px-3 py-2 text-base hover:bg-accent disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {uploading ? "Se încarcă…" : label}
        </button>
        <span className="text-sm text-muted-foreground">
          {ALLOWED_LABEL} · max. {MAX_MB} MB
        </span>
      </div>
      {error && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
