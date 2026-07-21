import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { QrCodePreview } from "@/components/QrCodePreview";
import { useI18n } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";

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

function validate(v: BuildingFormValues, t: (k: string, vars?: Record<string, string | number>) => string): FieldErrors {
  const errs: FieldErrors = {};
  const name = v.name.trim();
  if (!name) errs.name = t("err.name.required");
  else if (name.length < 2) errs.name = t("err.name.min");
  else if (name.length > 150) errs.name = t("err.name.max");

  const slug = v.slug.trim();
  if (!slug) errs.slug = t("err.slug.required");
  else if (slug.length < 2) errs.slug = t("err.slug.min");
  else if (slug.length > 100) errs.slug = t("err.slug.max");
  else if (!SLUG_RE.test(slug)) errs.slug = t("err.slug.format");

  const year = v.year_built.trim();
  if (year) {
    if (!/^-?\d{1,4}$/.test(year)) {
      errs.year_built = t("err.year.int");
    } else {
      const n = parseInt(year, 10);
      if (n < -3000 || n > CURRENT_YEAR) {
        errs.year_built = t("err.year.range", { min: -3000, max: CURRENT_YEAR });
      }
    }
  }

  if (v.short_description.length > 500) errs.short_description = t("err.short.max");

  if (v.cover_image_url && !/^https?:\/\/\S+$/i.test(v.cover_image_url.trim()))
    errs.cover_image_url = t("err.cover.url");

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
  const { t } = useI18n();
  const [v, setV] = useState<BuildingFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [translating, setTranslating] = useState<null | "short_description" | "history">(null);
  const translate = useServerFn(translateText);

  async function handleTranslate(field: "short_description" | "history") {
    const text = v[field].trim();
    if (!text) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslating(field);
    try {
      const res = await translate({ data: { text, target: "en" } });
      setV((p) => ({ ...p, [field]: res.text }));
    } catch (e: any) {
      toast.error(e?.message ?? t("translate.error"));
    } finally {
      setTranslating(null);
    }
  }

  function set<K extends keyof BuildingFormValues>(k: K, val: BuildingFormValues[K]) {
    setV((p) => {
      const next = { ...p, [k]: val };
      if (attempted) setFieldErrors(validate(next, t));
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const errs = validate(v, t);
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
      <Field label={t("field.name")} error={fieldErrors.name}>
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
        label={t("field.slug")}
        error={fieldErrors.slug}
        hint={t("field.slug.hint")}
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
        <Field label={t("field.address")}>
          <input className={inputCls} value={v.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label={t("field.year")} error={fieldErrors.year_built} hint={t("field.year.hint")}>
          <input
            inputMode="numeric"
            className={inputCls}
            value={v.year_built}
            aria-invalid={!!fieldErrors.year_built}
            onChange={(e) => set("year_built", e.target.value)}
          />
        </Field>
      </div>
      <Field label={t("field.architect")}>
        <input className={inputCls} value={v.architect} onChange={(e) => set("architect", e.target.value)} />
      </Field>
      <Field label={t("field.cover")} error={fieldErrors.cover_image_url}>
        <input
          type="url"
          placeholder="https://…"
          className={inputCls}
          value={v.cover_image_url}
          aria-invalid={!!fieldErrors.cover_image_url}
          onChange={(e) => set("cover_image_url", e.target.value)}
        />
        <ImageUploader label={t("field.uploadCover")} onUploaded={(url) => set("cover_image_url", url)} />
        {v.cover_image_url && (
          <img
            src={v.cover_image_url}
            alt=""
            className="mt-2 h-32 rounded border object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
      </Field>
      <Field
        label={t("field.short")}
        error={fieldErrors.short_description}
        action={
          <TranslateButton
            label={t("translate.toEn")}
            loadingLabel={t("translate.loading")}
            loading={translating === "short_description"}
            disabled={translating !== null}
            onClick={() => handleTranslate("short_description")}
          />
        }
      >
        <textarea
          rows={2}
          className={inputCls}
          value={v.short_description}
          aria-invalid={!!fieldErrors.short_description}
          onChange={(e) => set("short_description", e.target.value)}
        />
      </Field>
      <Field
        label={t("field.history")}
        action={
          <TranslateButton
            label={t("translate.toEn")}
            loadingLabel={t("translate.loading")}
            loading={translating === "history"}
            disabled={translating !== null}
            onClick={() => handleTranslate("history")}
          />
        }
      >
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
          {errorCount === 1 ? t("form.checkOne") : t("form.checkMany", { n: errorCount })}
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
        {submitting ? t("form.saving") : submitLabel}
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
  action,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <label className="block" data-field-error={error ? "true" : undefined}>
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-base font-medium">{label}</span>
        {action}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-sm text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-sm font-medium text-destructive">{error}</span>}
    </label>
  );
}

function TranslateButton({
  label,
  loadingLabel,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Languages className="h-3.5 w-3.5" />
      )}
      {loading ? loadingLabel : label}
    </button>
  );
}

