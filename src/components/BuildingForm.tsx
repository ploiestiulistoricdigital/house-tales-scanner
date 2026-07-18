import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";

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

export function BuildingForm({
  initial,
  submitLabel,
  onSubmit,
  submitting,
  error,
}: {
  initial: BuildingFormValues;
  submitLabel: string;
  onSubmit: (v: BuildingFormValues) => void;
  submitting: boolean;
  error: string | null;
}) {
  const [v, setV] = useState<BuildingFormValues>(initial);
  const [slugTouched, setSlugTouched] = useState(initial.slug !== "");

  function set<K extends keyof BuildingFormValues>(k: K, val: BuildingFormValues[K]) {
    setV((p) => ({ ...p, [k]: val }));
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(v);
      }}
    >
      <Field label="Nume *">
        <input
          required
          className={inputCls}
          value={v.name}
          onChange={(e) => {
            const n = e.target.value;
            set("name", n);
            if (!slugTouched) set("slug", slugify(n));
          }}
        />
      </Field>
      <Field label="Identificator URL * (folosit în adresa: /b/<slug>)">
        <input
          required
          pattern="[a-z0-9\-]+"
          className={inputCls}
          value={v.slug}
          onChange={(e) => {
            setSlugTouched(true);
            set("slug", e.target.value);
          }}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Adresă">
          <input className={inputCls} value={v.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Anul construcției">
          <input
            className={inputCls}
            value={v.year_built}
            onChange={(e) => set("year_built", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Arhitect">
        <input className={inputCls} value={v.architect} onChange={(e) => set("architect", e.target.value)} />
      </Field>
      <Field label="URL imagine principală">
        <input
          type="url"
          placeholder="https://…"
          className={inputCls}
          value={v.cover_image_url}
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
      <Field label="Descriere scurtă (1–2 propoziții)">
        <textarea
          rows={2}
          className={inputCls}
          value={v.short_description}
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
      {error && <p className="text-base text-destructive">{error}</p>}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-base font-medium mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
