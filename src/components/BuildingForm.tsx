import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { QrCodePreview } from "@/components/QrCodePreview";

export type BuildingFormValues = {
  slug: string;
  name: string;
  address: string;
  year_built: string;
  architect: string;
  short_description: string;
  history: string;
  cover_image_url: string;
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CURRENT_YEAR = new Date().getFullYear();

type FieldErrors = Partial<Record<keyof BuildingFormValues, string>>;

function validate(v: BuildingFormValues): FieldErrors {
  const errs: FieldErrors = {};
  const name = v.name.trim();
  if (!name) errs.name = "Numele este obligatoriu.";
  else if (name.length < 2) errs.name = "Numele trebuie să aibă cel puțin 2 caractere.";
  else if (name.length > 150) errs.name = "Numele este prea lung (max. 150 caractere).";

  const slug = v.slug.trim();
  if (!slug) errs.slug = "Identificatorul URL este obligatoriu.";
  else if (slug.length < 2) errs.slug = "Identificatorul URL trebuie să aibă cel puțin 2 caractere.";
  else if (slug.length > 100) errs.slug = "Identificatorul URL este prea lung (max. 100 caractere).";
  else if (!SLUG_RE.test(slug))
    errs.slug =
      "Folosește doar litere mici, cifre și cratime (fără spații sau diacritice). Ex: casa-batllo";

  const year = v.year_built.trim();
  if (year) {
    if (!/^-?\d{1,4}$/.test(year)) {
      errs.year_built = "Anul trebuie să fie un număr întreg (ex: 1904).";
    } else {
      const n = parseInt(year, 10);
      if (n < -3000 || n > CURRENT_YEAR) {
        errs.year_built = `Anul trebuie să fie între -3000 și ${CURRENT_YEAR}.`;
      }
    }
  }

  if (v.short_description.length > 500)
    errs.short_description = "Descrierea scurtă este prea lungă (max. 500 caractere).";

  if (v.cover_image_url && !/^https?:\/\/\S+$/i.test(v.cover_image_url.trim()))
    errs.cover_image_url = "URL invalid. Trebuie să înceapă cu http:// sau https://.";

  return errs;
}

export function BuildingForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
  error,
  buildingId,
}: {
  initial: BuildingFormValues;
  submitLabel: string;
  onSubmit: (v: BuildingFormValues) => void;
  submitting: boolean;
  error: string | null;
  buildingId?: string;
}) {
  const [v, setV] = useState<BuildingFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);

  function set<K extends keyof BuildingFormValues>(k: K, val: BuildingFormValues[K]) {
    setV((p) => {
      const next = { ...p, [k]: val };
      if (attempted) setFieldErrors(validate(next));
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const errs = validate(v);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = document.querySelector<HTMLElement>("[data-field-error='true']");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    onSubmit({ ...v, name: v.name.trim(), slug: v.slug.trim() });
  }

  const errorCount = Object.keys(fieldErrors).length;

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <Field label="Nume *" error={fieldErrors.name}>
        <input
          className={inputCls}
          value={v.name}
          aria-invalid={!!fieldErrors.name}
          onChange={(e) => {
            const n = e.target.value;
            set("name", n);
            if (!slugTouched) set("slug", slugify(n));
          }}
        />
      </Field>
      <Field
        label="Identificator URL * (folosit în adresa: /b/<slug>)"
        error={fieldErrors.slug}
        hint="Doar litere mici, cifre și cratime. Ex: casa-batllo"
      >
        <input
          className={inputCls}
          value={v.slug}
          aria-invalid={!!fieldErrors.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value);
          }}
        />
      </Field>
      <QrCodePreview slug={v.slug} buildingId={buildingId} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Adresă">
          <input className={inputCls} value={v.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Anul construcției" error={fieldErrors.year_built} hint="Ex: 1904">
          <input
            inputMode="numeric"
            className={inputCls}
            value={v.year_built}
            aria-invalid={!!fieldErrors.year_built}
            onChange={(e) => set("year_built", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Arhitect">
        <input className={inputCls} value={v.architect} onChange={(e) => set("architect", e.target.value)} />
      </Field>
      <Field label="URL imagine principală" error={fieldErrors.cover_image_url}>
        <input
          type="url"
          placeholder="https://…"
          className={inputCls}
          value={v.cover_image_url}
          aria-invalid={!!fieldErrors.cover_image_url}
          onChange={(e) => set("cover_image_url", e.target.value)}
        />
        <ImageUploader label="Încarcă imagine principală" onUploaded={(url) => set("cover_image_url", url)} />
        {v.cover_image_url && (
          <img
            src={v.cover_image_url}
            alt=""
            className="mt-2 h-32 rounded border object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
      </Field>
      <Field label="Descriere scurtă (1–2 propoziții)" error={fieldErrors.short_description}>
        <textarea
          rows={2}
          className={inputCls}
          value={v.short_description}
          aria-invalid={!!fieldErrors.short_description}
          onChange={(e) => set("short_description", e.target.value)}
        />
      </Field>
      <Field label="Istoric (text complet)">
        <textarea
          rows={12}
          className={inputCls}
          value={v.history}
          onChange={(e) => set("history", e.target.value)}
        />
      </Field>
      {attempted && errorCount > 0 && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive"
        >
          Verifică {errorCount === 1 ? "câmpul marcat" : `cele ${errorCount} câmpuri marcate`} înainte de salvare.
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive"
        >
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-primary text-primary-foreground px-5 py-3 text-base font-medium min-h-11 hover:bg-primary/90 disabled:opacity-50"
      >
        {submitting ? "Se salvează…" : submitLabel}
      </button>
    </form>
  );
}

const inputCls = "w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background";

function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block" data-field-error={error ? "true" : undefined}>
      <span className="text-base font-medium mb-1.5 block">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-sm font-medium text-destructive">{error}</span>}
    </label>
  );
}
