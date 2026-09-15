import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { useI18n } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";
import { chunkText } from "@/lib/text-chunks";

export const HERITAGE_CATEGORIES = ["locuri_disparute", "oameni_povesti", "documente_arhiva"] as const;
export type HeritageCategory = (typeof HERITAGE_CATEGORIES)[number];

export type HeritageItemFormValues = {
  category: HeritageCategory;
  slug: string;
  title: string;
  title_en: string;
  title_fr: string;
  description: string;
  description_en: string;
  description_fr: string;
  image_url: string;
  sort_order: number;
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

type TranslatableField = "title" | "description";
type FormLang = "ro" | "en" | "fr";
const FORM_LANGS: FormLang[] = ["ro", "en", "fr"];

function fieldKey(field: TranslatableField, lang: FormLang): keyof HeritageItemFormValues {
  if (lang === "ro") return field;
  return `${field}_${lang}` as keyof HeritageItemFormValues;
}

type FieldErrors = Partial<Record<keyof HeritageItemFormValues, string>>;

function validate(
  v: HeritageItemFormValues,
  t: (k: string, vars?: Record<string, string | number>) => string,
): FieldErrors {
  const errs: FieldErrors = {};
  const title = v.title.trim();
  if (!title) errs.title = t("err.name.required");
  else if (title.length < 2) errs.title = t("err.name.min");
  else if (title.length > 200) errs.title = t("err.name.max");

  const slug = v.slug.trim();
  if (!slug) errs.slug = t("err.slug.required");
  else if (slug.length < 2) errs.slug = t("err.slug.min");
  else if (slug.length > 100) errs.slug = t("err.slug.max");
  else if (!SLUG_RE.test(slug)) errs.slug = t("err.slug.format");

  return errs;
}

export function HeritageItemForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
  error,
}: {
  initial: HeritageItemFormValues;
  submitLabel: string;
  onSubmit: (v: HeritageItemFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<HeritageItemFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [translating, setTranslating] = useState<null | { field: TranslatableField; source: FormLang; target: FormLang }>(
    null,
  );
  const [fillingFr, setFillingFr] = useState(false);
  const [fillingEn, setFillingEn] = useState(false);
  const translate = useServerFn(translateText);

  async function translateLong(text: string, target: FormLang): Promise<string> {
    const chunks = chunkText(text);
    if (chunks.length <= 1) {
      const res = await translate({ data: { text, target } });
      return res.text;
    }
    const results: string[] = new Array(chunks.length);
    let next = 0;
    async function worker() {
      while (next < chunks.length) {
        const i = next++;
        const res = await translate({ data: { text: chunks[i], target } });
        results[i] = res.text;
      }
    }
    await Promise.all(Array.from({ length: Math.min(3, chunks.length) }, worker));
    return results.join("\n\n");
  }

  async function handleFillLang(target: "fr" | "en") {
    const fields: TranslatableField[] = ["title", "description"];
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
          const translated = await translateLong(text, target);
          setV((p) => ({ ...p, [fieldKey(field, target)]: translated }));
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
      const translated = await translateLong(text, target);
      setV((p) => ({ ...p, [destKey]: translated }));
    } catch (e: any) {
      toast.error(e?.message ?? t("translate.error"));
    } finally {
      setTranslating(null);
    }
  }

  function set<K extends keyof HeritageItemFormValues>(k: K, val: HeritageItemFormValues[K]) {
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
      title: v.title.trim(),
      title_en: v.title_en.trim(),
      title_fr: v.title_fr.trim(),
      slug: v.slug.trim(),
    });
  }

  const errorCount = Object.keys(fieldErrors).length;

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleFillEn}
          disabled={fillingEn || fillingFr || translating !== null}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-60"
        >
          {fillingEn ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          {fillingEn ? t("translate.loading") : t("translate.fillEn")}
        </button>
        <button
          type="button"
          onClick={handleFillFr}
          disabled={fillingFr || fillingEn || translating !== null}
          className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-background px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-60"
        >
          {fillingFr ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
          {fillingFr ? t("translate.loading") : t("translate.fillFr")}
        </button>
      </div>

      <Field label={t("heritageItems.field.category")}>
        <select
          className={inputCls}
          value={v.category}
          onChange={(e) => set("category", e.target.value as HeritageCategory)}
        >
          {HERITAGE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`heritageItems.category.${c}`)}
            </option>
          ))}
        </select>
      </Field>

      <MultilingualField
        label={t("field.name")}
        field="title"
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
        onChange={(lang, val) => set(fieldKey("title", lang), val)}
      />

      <Field label={t("field.slug")} error={fieldErrors.slug} hint={t("field.slug.hint")}>
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

      <Field label={t("field.cover")}>
        <ImageUploader label={t("field.uploadCover")} onUploaded={(url) => set("image_url", url)} />
        {v.image_url && (
          <img
            src={v.image_url}
            alt=""
            className="mt-2 h-32 rounded border object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
      </Field>

      <MultilingualField
        label={t("heritageItems.field.description")}
        field="description"
        values={v}
        errors={fieldErrors}
        translating={translating}
        onTranslate={handleTranslate}
        t={t}
        renderInput={(_lang, value, onChange) => (
          <textarea rows={6} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
        )}
        onChange={(lang, val) => set(fieldKey("description", lang), val)}
      />

      <Field label={t("heritageItems.field.sortOrder")} hint={t("heritageItems.field.sortOrder.hint")}>
        <input
          type="number"
          min={0}
          max={9999}
          className={inputCls}
          value={v.sort_order}
          onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
        />
      </Field>

      {attempted && errorCount > 0 && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
          {errorCount === 1 ? t("form.checkOne") : t("form.checkMany", { n: errorCount })}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-base text-destructive">
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
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="block" data-field-error={error ? "true" : undefined}>
      <span className="mb-1.5 block text-base font-medium">{label}</span>
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
  values: HeritageItemFormValues;
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
    <fieldset className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4" data-field-error={anyError ? "true" : undefined}>
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
                      loading={translating?.field === field && translating.source === lang && translating.target === target}
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
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
      {loading ? loadingLabel : label}
    </button>
  );
}
