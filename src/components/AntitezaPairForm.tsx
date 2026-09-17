import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { useI18n } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";

export type AntitezaPairFormValues = {
  before_image_url: string;
  after_image_url: string;
  before_caption: string;
  before_caption_en: string;
  before_caption_fr: string;
  after_caption: string;
  after_caption_en: string;
  after_caption_fr: string;
  sort_order: number;
};

type Side = "before" | "after";
type FormLang = "ro" | "en" | "fr";

function captionKey(side: Side, lang: FormLang): keyof AntitezaPairFormValues {
  if (lang === "ro") return `${side}_caption`;
  return `${side}_caption_${lang}` as keyof AntitezaPairFormValues;
}

type FieldErrors = Partial<Record<"before_image_url" | "after_image_url", string>>;

function validate(
  v: AntitezaPairFormValues,
  t: (k: string) => string,
): FieldErrors {
  const errs: FieldErrors = {};
  if (!v.before_image_url.trim()) errs.before_image_url = t("antiteza.err.beforeImage.required");
  if (!v.after_image_url.trim()) errs.after_image_url = t("antiteza.err.afterImage.required");
  return errs;
}

const inputCls = "w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background";

export function AntitezaPairForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
  error,
}: {
  initial: AntitezaPairFormValues;
  submitLabel: string;
  onSubmit: (v: AntitezaPairFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<AntitezaPairFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [translating, setTranslating] = useState<null | `${Side}:${FormLang}`>(null);
  const translate = useServerFn(translateText);

  function set<K extends keyof AntitezaPairFormValues>(k: K, val: AntitezaPairFormValues[K]) {
    setV((p) => {
      const next = { ...p, [k]: val };
      if (attempted) setFieldErrors(validate(next, t));
      return next;
    });
  }

  async function translateCaption(side: Side, target: "en" | "fr") {
    const ro = String(v[captionKey(side, "ro")] ?? "").trim();
    const other = String(v[captionKey(side, target === "en" ? "fr" : "en")] ?? "").trim();
    const source = ro || other;
    if (!source) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslating(`${side}:${target}`);
    try {
      const res = await translate({ data: { text: source, target } });
      set(captionKey(side, target), res.text);
    } catch (e: any) {
      toast.error(e?.message ?? t("translate.error"));
    } finally {
      setTranslating(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    const errs = validate(v, t);
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit(v);
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <ImageSideFields
        side="before"
        imageLabel={t("antiteza.field.beforeImage")}
        captionLabel={t("antiteza.field.beforeCaption")}
        imageUrl={v.before_image_url}
        imageError={fieldErrors.before_image_url}
        onImageUploaded={(url) => set("before_image_url", url)}
        v={v}
        set={set}
        translating={translating}
        onTranslate={translateCaption}
      />
      <ImageSideFields
        side="after"
        imageLabel={t("antiteza.field.afterImage")}
        captionLabel={t("antiteza.field.afterCaption")}
        imageUrl={v.after_image_url}
        imageError={fieldErrors.after_image_url}
        onImageUploaded={(url) => set("after_image_url", url)}
        v={v}
        set={set}
        translating={translating}
        onTranslate={translateCaption}
      />

      <label className="block">
        <span className="mb-1.5 block text-base font-medium">{t("antiteza.field.sortOrder")}</span>
        <input
          type="number"
          min={0}
          max={9999}
          className={inputCls}
          value={v.sort_order}
          onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
        />
        <span className="mt-1 block text-sm text-muted-foreground">{t("antiteza.field.sortOrder.hint")}</span>
      </label>

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

function ImageSideFields({
  side,
  imageLabel,
  captionLabel,
  imageUrl,
  imageError,
  onImageUploaded,
  v,
  set,
  translating,
  onTranslate,
}: {
  side: Side;
  imageLabel: string;
  captionLabel: string;
  imageUrl: string;
  imageError?: string;
  onImageUploaded: (url: string) => void;
  v: AntitezaPairFormValues;
  set: <K extends keyof AntitezaPairFormValues>(k: K, val: AntitezaPairFormValues[K]) => void;
  translating: null | `${Side}:${FormLang}`;
  onTranslate: (side: Side, target: "en" | "fr") => void;
}) {
  const { t } = useI18n();
  return (
    <fieldset className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-3">
      <legend className="px-1 text-base font-medium">{imageLabel}</legend>
      <ImageUploader bucket="antiteza-images" onUploaded={onImageUploaded} />
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="h-32 rounded border object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}
      {imageError && <span className="block text-sm font-medium text-destructive">{imageError}</span>}

      <div className="space-y-2 pt-2 border-t border-border/60">
        <span className="block text-sm font-medium">{captionLabel}</span>
        <CaptionRow lang="RO" value={v[captionKey(side, "ro")] as string} onChange={(val) => set(captionKey(side, "ro"), val)} />
        <CaptionRow
          lang="EN"
          value={v[captionKey(side, "en")] as string}
          onChange={(val) => set(captionKey(side, "en"), val)}
          onTranslate={() => onTranslate(side, "en")}
          translating={translating === `${side}:en`}
          disabled={translating !== null}
        />
        <CaptionRow
          lang="FR"
          value={v[captionKey(side, "fr")] as string}
          onChange={(val) => set(captionKey(side, "fr"), val)}
          onTranslate={() => onTranslate(side, "fr")}
          translating={translating === `${side}:fr`}
          disabled={translating !== null}
        />
      </div>
    </fieldset>
  );
}

function CaptionRow({
  lang,
  value,
  onChange,
  onTranslate,
  translating,
  disabled,
}: {
  lang: "RO" | "EN" | "FR";
  value: string;
  onChange: (v: string) => void;
  onTranslate?: () => void;
  translating?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground w-6 shrink-0">{lang}</span>
      <input
        className="flex-1 rounded-md border border-border/70 px-3 py-3 text-base bg-background"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {onTranslate && (
        <button
          type="button"
          onClick={onTranslate}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-2 text-sm hover:bg-muted disabled:opacity-50"
          aria-label="Translate"
        >
          {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
