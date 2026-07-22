import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { QrCodePreview } from "@/components/QrCodePreview";
import { useI18n, type Lang } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";

export type BuildingFormValues = {
  slug: string;
  name: string;
  name_en: string;
  name_fr: string;
  address: string;
  address_en: string;
  address_fr: string;
  year_built: string;
  architect: string;
  short_description: string;
  short_description_en: string;
  short_description_fr: string;
  history: string;
  history_en: string;
  history_fr: string;
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

type TranslatableField = "name" | "address" | "short_description" | "history";
type FormLang = "ro" | "en" | "fr";
const FORM_LANGS: FormLang[] = ["ro", "en", "fr"];

function fieldKey(field: TranslatableField, lang: FormLang): keyof BuildingFormValues {
  if (lang === "ro") return field as keyof BuildingFormValues;
  return `${field}_${lang}` as keyof BuildingFormValues;
}

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

  if (v.year_built.length > 50) errs.year_built = t("err.year.max");

  if (v.short_description.length > 500) errs.short_description = t("err.short.max");
  if (v.short_description_en.length > 500) errs.short_description_en = t("err.short.max");
  if (v.short_description_fr.length > 500) errs.short_description_fr = t("err.short.max");

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
  const [translating, setTranslating] = useState<null | { field: TranslatableField; source: FormLang; target: FormLang }>(null);
  const [fillingFr, setFillingFr] = useState(false);
  const [fillingEn, setFillingEn] = useState(false);
  const translate = useServerFn(translateText);

  async function handleFillLang(target: "fr" | "en") {
    const fields: TranslatableField[] = ["name", "address", "short_description", "history"];
    const otherLang: FormLang = target === "fr" ? "en" : "fr";
    const setBusy = target === "fr" ? setFillingFr : setFillingEn;
    setBusy(true);
    let filled = 0;
    let skipped = 0;
    try {
      for (const field of fields) {
        const ro = String(v[fieldKey(field, "ro")] ?? "").trim();
        const other = String(v[fieldKey(field, otherLang)] ?? "").trim();
        const source: FormLang | null = ro ? "ro" : other ? otherLang : null;
        if (!source) {
          skipped++;
          continue;
        }
        const text = source === "ro" ? ro : other;
        try {
          const res = await translate({ data: { text, target } });
          setV((p) => ({ ...p, [fieldKey(field, target)]: res.text }));
          filled++;
        } catch (e: any) {
          toast.error(e?.message ?? t("translate.error"));
        }
      }
      const doneKey = target === "fr" ? "translate.fillFr.done" : "translate.fillEn.done";
      if (filled > 0) toast.success(t(doneKey, { n: filled }));
      else if (skipped === fields.length) toast.error(t("translate.empty"));
    } finally {
      setBusy(false);
    }
  }

  const handleFillFr = () => handleFillLang("fr");
  const handleFillEn = () => handleFillLang("en");

  async function handleTranslate(field: TranslatableField, source: FormLang, target: FormLang) {
    const sourceKey = fieldKey(field, source);
    const destKey = fieldKey(field, target);
    const text = String(v[sourceKey] ?? "").trim();
    if (!text) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslating({ field, source, target });
    try {
      const res = await translate({ data: { text, target } });
      setV((p) => ({ ...p, [destKey]: res.text }));
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
    onSubmit({
      ...v,
      name: v.name.trim(),
      name_en: v.name_en.trim(),
      name_fr: v.name_fr.trim(),
      slug: v.slug.trim(),
      address_en: v.address_en.trim(),
      address_fr: v.address_fr.trim(),
    });
  }

  const errorCount = Object.keys(fieldErrors).length;

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleFillFr}
          disabled={fillingFr || translating !== null}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-60"
        >
          {fillingFr ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          {fillingFr ? t("translate.loading") : t("translate.fillFr")}
        </button>
      </div>
      <MultilingualField
        label={t("field.name")}
        field="name"
        values={v}
        errors={fieldErrors}
        translating={translating}
        onTranslate={handleTranslate}
        t={t}
        renderInput={(lang, value, onChange, invalid) => (
          <input
            className={inputCls}
            value={value}
            aria-invalid={invalid}
            onChange={(e) => {
              const n = e.target.value;
              onChange(n);
              if (lang === "ro" && !slugTouched) set("slug", slugify(n));
            }}
          />
        )}
        onChange={(lang, val) => set(fieldKey("name", lang), val)}
      />
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

      <MultilingualField
        label={t("field.address")}
        field="address"
        values={v}
        errors={fieldErrors}
        translating={translating}
        onTranslate={handleTranslate}
        t={t}
        renderInput={(_lang, value, onChange) => (
          <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
        )}
        onChange={(lang, val) => set(fieldKey("address", lang), val)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("field.year")} error={fieldErrors.year_built} hint={t("field.year.hint")}>
          <input
            type="text"
            inputMode="text"
            className={inputCls}
            value={v.year_built}
            placeholder={t("field.year.placeholder")}
            aria-invalid={!!fieldErrors.year_built}
            onChange={(e) => set("year_built", e.target.value)}
          />
        </Field>
        <Field label={t("field.architect")}>
          <input className={inputCls} value={v.architect} onChange={(e) => set("architect", e.target.value)} />
        </Field>
      </div>

      <Field label={t("field.cover")}>
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

      <MultilingualField
        label={t("field.short")}
        field="short_description"
        values={v}
        errors={fieldErrors}
        translating={translating}
        onTranslate={handleTranslate}
        t={t}
        renderInput={(_lang, value, onChange, invalid) => (
          <textarea
            rows={2}
            className={inputCls}
            value={value}
            aria-invalid={invalid}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        onChange={(lang, val) => set(fieldKey("short_description", lang), val)}
      />

      <MultilingualField
        label={t("field.history")}
        field="history"
        values={v}
        errors={fieldErrors}
        translating={translating}
        onTranslate={handleTranslate}
        t={t}
        renderInput={(_lang, value, onChange) => (
          <textarea
            rows={12}
            className={inputCls}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        onChange={(lang, val) => set(fieldKey("history", lang), val)}
      />

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

const TRANSLATE_LABEL_KEY: Record<FormLang, string> = {
  ro: "translate.toRo",
  en: "translate.toEn",
  fr: "translate.toFr",
};

function MultilingualField({
  label,
  field,
  values,
  errors,
  translating,
  onTranslate,
  onChange,
  renderInput,
  t,
}: {
  label: string;
  field: TranslatableField;
  values: BuildingFormValues;
  errors: FieldErrors;
  translating: null | { field: TranslatableField; source: FormLang; target: FormLang };
  onTranslate: (field: TranslatableField, source: FormLang, target: FormLang) => void;
  onChange: (lang: FormLang, value: string) => void;
  renderInput: (lang: FormLang, value: string, onChange: (v: string) => void, invalid: boolean) => React.ReactNode;
  t: (k: string) => string;
}) {
  const busy = translating !== null;
  const anyError = FORM_LANGS.some((l) => errors[fieldKey(field, l)]);
  return (
    <fieldset
      className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4"
      data-field-error={anyError ? "true" : undefined}
    >
      <legend className="px-1 text-base font-medium">{label}</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FORM_LANGS.map((lang) => {
          const key = fieldKey(field, lang);
          const value = String(values[key] ?? "");
          const err = errors[key];
          const otherLangs = FORM_LANGS.filter((l) => l !== lang);
          return (
            <div key={lang} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-widest text-muted-foreground">{t(`lang.${lang}`)}</span>
                <div className="flex items-center gap-1">
                  {otherLangs.map((target) => (
                    <TranslateButton
                      key={target}
                      label={t(TRANSLATE_LABEL_KEY[target])}
                      loadingLabel={t("translate.loading")}
                      loading={
                        translating?.field === field &&
                        translating.source === lang &&
                        translating.target === target
                      }
                      disabled={busy}
                      onClick={() => onTranslate(field, lang, target)}
                    />
                  ))}
                </div>
              </div>
              {renderInput(lang, value, (val) => onChange(lang, val), !!err)}
              {err && <span className="block text-sm font-medium text-destructive">{err}</span>}
            </div>
          );
        })}
      </div>
    </fieldset>
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
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-background px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-60"
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
// Lang import kept for potential external consumers
export type { Lang };
