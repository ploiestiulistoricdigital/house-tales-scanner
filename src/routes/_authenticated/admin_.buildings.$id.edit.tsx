import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BuildingForm, type BuildingFormValues } from "@/components/BuildingForm";
import { ImageUploader } from "@/components/ImageUploader";
import {
  updateBuilding,
  addBuildingImage,
  deleteBuildingImage,
} from "@/lib/buildings.functions";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin_/buildings/$id/edit")({
  head: () => ({ meta: [{ title: "Edit building — Admin" }] }),
  component: EditBuilding,
});

function EditBuilding() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const update = useServerFn(updateBuilding);
  const addImg = useServerFn(addBuildingImage);
  const delImg = useServerFn(deleteBuildingImage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteImg, setPendingDeleteImg] = useState<string | null>(null);
  const [newImgUrl, setNewImgUrl] = useState("");
  const [newImgCaption, setNewImgCaption] = useState("");

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
          address: v.address || null,
          address_en: v.address_en || null,
          year_built: v.year_built || null,
          architect: v.architect || null,
          short_description: v.short_description || null,
          short_description_en: v.short_description_en || null,
          history: v.history || null,
          history_en: v.history_en || null,
          cover_image_url: v.cover_image_url || null,
        },
      });
      qc.invalidateQueries({ queryKey: ["building", id] });
      qc.invalidateQueries({ queryKey: ["admin-buildings"] });
      qc.invalidateQueries({ queryKey: ["buildings"] });
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
          sort_order: images?.length ?? 0,
        },
      });
      setNewImgUrl("");
      setNewImgCaption("");
      qc.invalidateQueries({ queryKey: ["building-images", id] });
    } catch (e: any) {
      toast.error(e.message);
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
            name_en: (building as any).name_en ?? "",
            address: building.address ?? "",
            address_en: (building as any).address_en ?? "",
            year_built: building.year_built ?? "",
            architect: building.architect ?? "",
            short_description: building.short_description ?? "",
            short_description_en: (building as any).short_description_en ?? "",
            history: building.history ?? "",
            history_en: (building as any).history_en ?? "",
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
            {images?.map((img) => (
              <div key={img.id} className="flex items-center gap-3 rounded-md border border-border/70 p-2">
                <img src={img.image_url} alt="" className="h-16 w-16 rounded object-cover bg-muted shrink-0" />
                {img.caption && (
                  <div className="flex-1 min-w-0 text-base">
                    <div className="mt-1">{img.caption}</div>
                  </div>
                )}
                <button
                  onClick={() => setPendingDeleteImg(img.id)}
                  className="ml-auto p-2 hover:bg-destructive/10 hover:text-destructive rounded inline-flex items-center justify-center"
                  aria-label={t("gallery.deleteImage")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
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
            <input
              placeholder={t("gallery.captionPlaceholder")}
              className="w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background"
              value={newImgCaption}
              onChange={(e) => setNewImgCaption(e.target.value)}
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
