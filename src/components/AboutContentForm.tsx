import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";
import { chunkText } from "@/lib/text-chunks";
import { RichTextEditor } from "@/components/RichTextEditor";
import { chunkRichText, sanitizeRichText, toEditableHtml } from "@/lib/rich-text";

export type AboutContentFormValues = {
  title: string;
  title_en: string;
  title_fr: string;
  description: string;
  description_en: string;
  description_fr: string;
};

type Field = "title" | "description";
type FormLang = "ro" | "en" | "fr";
const FORM_LANGS: FormLang[] = ["ro", "en", "fr"];

function fieldKey(field: Field, lang: FormLang): keyof AboutContentFormValues {
  if (lang === "ro") return field;
  return `${field}_${lang}` as keyof AboutContentFormValues;
}

const inputCls = "w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background";

export function AboutContentForm({
  initial,
  onSubmit,
  submitting,
  error,
}: {
  initial: AboutContentFormValues;
  onSubmit: (v: AboutContentFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<AboutContentFormValues>(initial);
  const [translating, setTranslating] = useState<null | { field: Field; lang: FormLang }>(null);
  const translate = useServerFn(translateText);

  function set<K extends keyof AboutContentFormValues>(k: K, val: AboutContentFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  async function translateLong(text: string, target: FormLang, rich: boolean): Promise<string> {
    const chunks = rich ? chunkRichText(text) : chunkText(text);
    if (chunks.length <= 1) {
      const res = await translate({ data: { text, target } });
      return rich ? sanitizeRichText(res.text) : res.text;
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
    const joined = results.join("\n\n");
    return rich ? sanitizeRichText(joined) : joined;
  }

  async function handleTranslate(field: Field, target: FormLang) {
    const otherLang: FormLang = FORM_LANGS.find((l) => l !== target && l !== "ro") === "en" ? "en" : "fr";
    const ro = v[fieldKey(field, "ro")].trim();
    const other = v[fieldKey(field, otherLang)].trim();
    const source = ro || other;
    if (!source) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslating({ field, lang: target });
    try {
      const translated = await translateLong(source, target, field === "description");
      set(fieldKey(field, target), translated);
    } catch (e: any) {
      toast.error(e?.message ?? t("translate.error"));
    } finally {
      setTranslating(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ ...v, title: v.title.trim(), title_en: v.title_en.trim(), title_fr: v.title_fr.trim() });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <TranslatableField
        label={t("about.field.title")}
        field="title"
        values={v}
        translating={translating}
        onTranslate={handleTranslate}
        onChange={(lang, val) => set(fieldKey("title", lang), val)}
        renderInput={(value, onChange) => <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />}
      />

      <TranslatableField
        label={t("about.field.description")}
        field="description"
        values={v}
        translating={translating}
        onTranslate={handleTranslate}
        onChange={(lang, val) => set(fieldKey("description", lang), val)}
        renderInput={(value, onChange) => <RichTextEditor value={toEditableHtml(value)} onChange={onChange} rows={6} />}
      />

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
        {submitting ? t("form.saving") : t("form.save")}
      </button>
    </form>
  );
}

function TranslatableField({
  label,
  field,
  values,
  translating,
  onTranslate,
  onChange,
  renderInput,
}: {
  label: string;
  field: Field;
  values: AboutContentFormValues;
  translating: null | { field: Field; lang: FormLang };
  onTranslate: (field: Field, lang: FormLang) => void;
  onChange: (lang: FormLang, value: string) => void;
  renderInput: (value: string, onChange: (v: string) => void) => React.ReactNode;
}) {
  const { t } = useI18n();
  const busy = translating !== null;
  return (
    <fieldset className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4">
      <legend className="px-1 text-base font-medium">{label}</legend>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {FORM_LANGS.map((lang) => (
          <div key={lang} className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">{t(`lang.${lang}`)}</span>
              {lang !== "ro" && (
                <button
                  type="button"
                  onClick={() => onTranslate(field, lang)}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/60 disabled:opacity-60"
                >
                  {translating?.field === field && translating.lang === lang ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Languages className="h-3.5 w-3.5" />
                  )}
                  {t(lang === "en" ? "translate.toEn" : "translate.toFr")}
                </button>
              )}
            </div>
            {renderInput(values[fieldKey(field, lang)], (val) => onChange(lang, val))}
          </div>
        ))}
      </div>
    </fieldset>
  );
}
