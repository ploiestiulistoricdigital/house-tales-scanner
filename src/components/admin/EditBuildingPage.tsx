import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Trash2, Plus, Languages, Loader2, Pencil, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BuildingForm, type BuildingFormValues } from "@/components/BuildingForm";
import { ImageUploader } from "@/components/ImageUploader";
import {
  updateBuilding,
  addBuildingImage,
  updateBuildingImage,
  deleteBuildingImage,
} from "@/lib/buildings.functions";
import { translateText } from "@/lib/translate.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";

export function EditBuildingPage({ id }: { id: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const update = useServerFn(updateBuilding);
  const addImg = useServerFn(addBuildingImage);
  const updImg = useServerFn(updateBuildingImage);
  const delImg = useServerFn(deleteBuildingImage);
  const translate = useServerFn(translateText);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteImg, setPendingDeleteImg] = useState<string | null>(null);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newImgCaption, setNewImgCaption] = useState("");
  const [newImgCaptionEn, setNewImgCaptionEn] = useState("");
  const [newImgCaptionFr, setNewImgCaptionFr] = useState("");
  const [translatingNew, setTranslatingNew] = useState<null | "en" | "fr">(null);
  const [editingImg, setEditingImg] = useState<string | null>(null);
  const [editRo, setEditRo] = useState("");
  const [editEn, setEditEn] = useState("");
  const [editFr, setEditFr] = useState("");
  const [savingImg, setSavingImg] = useState(false);
  const [translatingEdit, setTranslatingEdit] = useState<null | "en" | "fr">(null);

  const { data: building, isLoading } = useQuery({
    queryKey: ["building", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("buildings").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: images } = useQuery({
    queryKey: ["building-images", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("building_images")
        .select("*")
        .eq("building_id", id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  async function onSubmit(v: BuildingFormValues) {
    setSubmitting(true);
    setError(null);
    try {
      await update({
        data: {
          id,
          slug: v.slug,
          name: v.name,
          name_en: v.name_en || null,
          name_fr: v.name_fr || null,
          address: v.address || null,
          address_en: v.address_en || null,
          address_fr: v.address_fr || null,
          year_built: v.year_built || null,
          architect: v.architect || null,
          short_description: v.short_description || null,
          short_description_en: v.short_description_en || null,
          short_description_fr: v.short_description_fr || null,
          history: v.history || null,
          history_en: v.history_en || null,
          history_fr: v.history_fr || null,
          cover_image_url: v.cover_image_url || null,
        },
      });
      qc.invalidateQueries({ queryKey: ["building", id] });
      qc.invalidateQueries({ queryKey: ["admin-buildings"] });
      navigate({ to: "/admin" });
    } catch (e: any) {
      setError(e.message ?? t("form.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function onAddImage(e: React.FormEvent) {
    e.preventDefault();
    if (!newImgUrl) return;
    try {
      await addImg({
        data: {
          building_id: id,
          image_url: newImgUrl,
          caption: newImgCaption || null,
          caption_en: newImgCaptionEn || null,
          caption_fr: newImgCaptionFr || null,
          sort_order: images?.length ?? 0,
        },
      });
      setNewImgUrl("");
      setNewImgCaption("");
      setNewImgCaptionEn("");
      setNewImgCaptionFr("");
      qc.invalidateQueries({ queryKey: ["building-images", id] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function translateNewCaption(target: "en" | "fr") {
    const source = newImgCaption.trim() || (target === "en" ? newImgCaptionFr : newImgCaptionEn).trim();
    if (!source) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslatingNew(target);
    try {
      const res = await translate({ data: { text: source, target } });
      if (target === "en") setNewImgCaptionEn(res.text);
      else setNewImgCaptionFr(res.text);
    } catch (e: any) {
      toast.error(e?.message ?? t("translate.error"));
    } finally {
      setTranslatingNew(null);
    }
  }

  function startEditImg(img: { id: string; caption: string | null; caption_en: string | null; caption_fr: string | null }) {
    setEditingImg(img.id);
    setEditRo(img.caption ?? "");
    setEditEn(img.caption_en ?? "");
    setEditFr(img.caption_fr ?? "");
  }

  async function saveEditImg() {
    if (!editingImg) return;
    setSavingImg(true);
    try {
      await updImg({
        data: {
          id: editingImg,
          caption: editRo || null,
          caption_en: editEn || null,
          caption_fr: editFr || null,
        },
      });
      setEditingImg(null);
      qc.invalidateQueries({ queryKey: ["building-images", id] });
      toast.success(t("gallery.saveCaptions"));
    } catch (e: any) {
      toast.error(e?.message ?? t("form.saveFailed"));
    } finally {
      setSavingImg(false);
    }
  }

  async function translateEditCaption(target: "en" | "fr") {
    const source = editRo.trim() || (target === "en" ? editFr : editEn).trim();
    if (!source) {
      toast.error(t("translate.empty"));
      return;
    }
    setTranslatingEdit(target);
    try {
      const res = await translate({ data: { text: source, target } });
      if (target === "en") setEditEn(res.text);
      else setEditFr(res.text);
    } catch (e: any) {
      toast.error(e?.message ?? t("translate.error"));
    } finally {
      setTranslatingEdit(null);
    }
  }

  async function confirmDeleteImage() {
    if (!pendingDeleteImg) return;
    await delImg({ data: { id: pendingDeleteImg } });
    setPendingDeleteImg(null);
    qc.invalidateQueries({ queryKey: ["building-images", id] });
  }



  if (isLoading || !building) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1 min-h-11 text-base text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.back")}
          </Link>
          <LanguageSwitcher />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-6">{t("admin.editBuilding")}</h1>
        <BuildingForm
          initial={{
            slug: building.slug,
            name: building.name,
            name_en: building.name_en ?? "",
            name_fr: building.name_fr ?? "",
            address: building.address ?? "",
            address_en: building.address_en ?? "",
            address_fr: building.address_fr ?? "",
            year_built: building.year_built ?? "",
            architect: building.architect ?? "",
            short_description: building.short_description ?? "",
            short_description_en: building.short_description_en ?? "",
            short_description_fr: building.short_description_fr ?? "",
            history: building.history ?? "",
            history_en: building.history_en ?? "",
            history_fr: building.history_fr ?? "",
            cover_image_url: building.cover_image_url ?? "",
          }}
          submitLabel={t("form.save")}
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
          buildingId={id}
        />

        <section className="mt-12 border-t border-border/70 pt-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">{t("gallery.title")}</h2>
          <div className="space-y-2 mb-4">
            {images?.map((img) => {
              const isEditing = editingImg === img.id;
              return (
                <div key={img.id} className="rounded-md border border-border/70 p-2">
                  <div className="flex items-start gap-3">
                    <img src={img.image_url} alt="" className="h-16 w-16 rounded object-cover bg-muted shrink-0" />
                    {!isEditing ? (
                      <div className="flex-1 min-w-0 text-sm space-y-0.5">
                        {img.caption && <div><span className="text-xs uppercase tracking-widest text-muted-foreground mr-2">RO</span>{img.caption}</div>}
                        {img.caption_en && <div><span className="text-xs uppercase tracking-widest text-muted-foreground mr-2">EN</span>{img.caption_en}</div>}
                        {img.caption_fr && <div><span className="text-xs uppercase tracking-widest text-muted-foreground mr-2">FR</span>{img.caption_fr}</div>}
                        {!img.caption && !img.caption_en && !img.caption_fr && (
                          <div className="text-muted-foreground italic">—</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 space-y-2">
                        <CaptionRow lang="RO" value={editRo} onChange={setEditRo} placeholder={t("gallery.captionPlaceholder")} />
                        <CaptionRow
                          lang="EN"
                          value={editEn}
                          onChange={setEditEn}
                          placeholder={t("gallery.captionPlaceholder.en")}
                          onTranslate={() => translateEditCaption("en")}
                          translating={translatingEdit === "en"}
                          disabled={translatingEdit !== null || savingImg}
                        />
                        <CaptionRow
                          lang="FR"
                          value={editFr}
                          onChange={setEditFr}
                          placeholder={t("gallery.captionPlaceholder.fr")}
                          onTranslate={() => translateEditCaption("fr")}
                          translating={translatingEdit === "fr"}
                          disabled={translatingEdit !== null || savingImg}
                        />
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {!isEditing ? (
                        <>
                          <button
                            onClick={() => startEditImg(img)}
                            className="p-2 hover:bg-muted rounded inline-flex items-center justify-center"
                            aria-label={t("gallery.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setPendingDeleteImg(img.id)}
                            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded inline-flex items-center justify-center"
                            aria-label={t("gallery.deleteImage")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={saveEditImg}
                            disabled={savingImg}
                            className="p-2 hover:bg-primary/10 hover:text-primary rounded inline-flex items-center justify-center disabled:opacity-50"
                            aria-label={t("gallery.saveCaptions")}
                          >
                            {savingImg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingImg(null)}
                            className="p-2 hover:bg-muted rounded inline-flex items-center justify-center"
                            aria-label={t("gallery.cancel")}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {images?.length === 0 && (
              <p className="text-base text-muted-foreground">{t("gallery.empty")}</p>
            )}
          </div>
          <form onSubmit={onAddImage} className="space-y-3 rounded-md border border-border/70 p-3 bg-muted/30">
            <input
              type="url"
              placeholder={t("gallery.urlPlaceholder")}
              className="w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background"
              value={newImgUrl}
              onChange={(e) => setNewImgUrl(e.target.value)}
            />
            <ImageUploader
              label={t("gallery.uploadLabel")}
              onUploaded={(url) => setNewImgUrl(url)}
            />
            <CaptionRow lang="RO" value={newImgCaption} onChange={setNewImgCaption} placeholder={t("gallery.captionPlaceholder")} />
            <CaptionRow
              lang="EN"
              value={newImgCaptionEn}
              onChange={setNewImgCaptionEn}
              placeholder={t("gallery.captionPlaceholder.en")}
              onTranslate={() => translateNewCaption("en")}
              translating={translatingNew === "en"}
              disabled={translatingNew !== null}
            />
            <CaptionRow
              lang="FR"
              value={newImgCaptionFr}
              onChange={setNewImgCaptionFr}
              placeholder={t("gallery.captionPlaceholder.fr")}
              onTranslate={() => translateNewCaption("fr")}
              translating={translatingNew === "fr"}
              disabled={translatingNew !== null}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> {t("gallery.add")}
            </button>
          </form>

        </section>
      </div>

      <ConfirmDialog
        open={pendingDeleteImg !== null}
        onOpenChange={(o) => !o && setPendingDeleteImg(null)}
        title={t("gallery.confirmDelete.title")}
        description={t("gallery.confirmDelete")}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDeleteImage}
      />
    </div>
  );
}

function CaptionRow({
  lang,
  value,
  onChange,
  placeholder,
  onTranslate,
  translating,
  disabled,
}: {
  lang: "RO" | "EN" | "FR";
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onTranslate?: () => void;
  translating?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-widest text-muted-foreground w-6 shrink-0">{lang}</span>
      <input
        placeholder={placeholder}
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
