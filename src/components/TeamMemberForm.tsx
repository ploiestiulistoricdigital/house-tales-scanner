import { useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { RichTextEditor } from "@/components/RichTextEditor";
import { useI18n } from "@/lib/i18n";
import { translateText } from "@/lib/translate.functions";
import { chunkRichText, sanitizeRichText, toEditableHtml } from "@/lib/rich-text";

export type TeamMemberFormValues = {
  name: string;
  role: string;
  role_en: string;
  role_fr: string;
  photo_url: string;
  sort_order: number;
};

type FormLang = "ro" | "en" | "fr";

function roleKey(lang: FormLang): keyof TeamMemberFormValues {
  if (lang === "ro") return "role";
  return `role_${lang}` as keyof TeamMemberFormValues;
}

type FieldErrors = Partial<Record<"name", string>>;

function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length === 0;
}

function validate(v: TeamMemberFormValues, t: (k: string) => string): FieldErrors {
  const errs: FieldErrors = {};
  if (isBlankHtml(v.name)) errs.name = t("about.err.memberName.required");
  return errs;
}

const inputCls = "w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background";

export function TeamMemberForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
  error,
}: {
  initial: TeamMemberFormValues;
  submitLabel: string;
  onSubmit: (v: TeamMemberFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const { t } = useI18n();
  const [v, setV] = useState<TeamMemberFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [translating, setTranslating] = useState<FormLang | null>(null);
  const translate = useServerFn(translateText);

  function set<K extends keyof TeamMemberFormValues>(k: K, val: TeamMemberFormValues[K]) {
    setV((p) => {
      const next = { ...p, [k]: val };
      if (attempted) setFieldErrors(validate(next, t));
      return next;
    });
  }

  async function translateRole(target: "en" | "fr") {
    const ro = v.role.trim();
    const other = (target === "en" ? v.role_fr : v.role_en).trim();
    const source = ro || other;
    if (!source) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslating(target);
    try {
      const chunks = chunkRichText(source);
      const results = await Promise.all(chunks.map((chunk) => translate({ data: { text: chunk, target } })));
      const translated = sanitizeRichText(results.map((r) => r.text).join("\n\n"));
      set(roleKey(target), translated);
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
    onSubmit({ ...v, name: v.name.trim() });
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div data-field-error={fieldErrors.name ? "true" : undefined}>
        <span className="mb-1.5 block text-base font-medium">{t("about.field.memberName")}</span>
        <RichTextEditor value={toEditableHtml(v.name)} onChange={(val) => set("name", val)} rows={2} />
        {fieldErrors.name && <span className="mt-1 block text-sm font-medium text-destructive">{fieldErrors.name}</span>}
      </div>

      <div>
        <span className="mb-1.5 block text-base font-medium">{t("about.field.memberPhoto")}</span>
        <ImageUploader bucket="team-photos" onUploaded={(url) => set("photo_url", url)} />
        {v.photo_url && (
          <img
            src={v.photo_url}
            alt=""
            className="mt-2 h-24 w-24 rounded-full border object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
      </div>

      <fieldset className="rounded-md border border-border/70 bg-muted/20 p-3 sm:p-4 space-y-2">
        <legend className="px-1 text-base font-medium">{t("about.field.memberRole")}</legend>
        <RoleRow lang="RO" value={v.role} onChange={(val) => set("role", val)} />
        <RoleRow
          lang="EN"
          value={v.role_en}
          onChange={(val) => set("role_en", val)}
          onTranslate={() => translateRole("en")}
          translating={translating === "en"}
          disabled={translating !== null}
        />
        <RoleRow
          lang="FR"
          value={v.role_fr}
          onChange={(val) => set("role_fr", val)}
          onTranslate={() => translateRole("fr")}
          translating={translating === "fr"}
          disabled={translating !== null}
        />
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-base font-medium">{t("heritageItems.field.sortOrder")}</span>
        <input
          type="number"
          min={0}
          max={9999}
          className={inputCls}
          value={v.sort_order}
          onChange={(e) => set("sort_order", Math.min(9999, Math.max(0, Number(e.target.value) || 0)))}
        />
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

function RoleRow({
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
    <div className="flex items-start gap-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground w-6 shrink-0 mt-3">{lang}</span>
      <div className="flex-1">
        <RichTextEditor value={toEditableHtml(value)} onChange={onChange} rows={4} />
      </div>
      {onTranslate && (
        <button
          type="button"
          onClick={onTranslate}
          disabled={disabled}
          className="inline-flex items-center gap-1 rounded-md border border-border/70 px-2 py-2 text-sm hover:bg-muted disabled:opacity-50 mt-1"
          aria-label="Translate"
        >
          {translating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Languages className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
