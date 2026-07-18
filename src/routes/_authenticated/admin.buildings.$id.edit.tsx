import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BuildingForm, type BuildingFormValues } from "@/components/BuildingForm";
import {
  updateBuilding,
  addBuildingImage,
  deleteBuildingImage,
} from "@/lib/buildings.functions";

export const Route = createFileRoute("/_authenticated/admin/buildings/$id/edit")({
  head: () => ({ meta: [{ title: "Edit building — Admin" }] }),
  component: EditBuilding,
});

function EditBuilding() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const update = useServerFn(updateBuilding);
  const addImg = useServerFn(addBuildingImage);
  const delImg = useServerFn(deleteBuildingImage);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          address: v.address || null,
          year_built: v.year_built || null,
          architect: v.architect || null,
          short_description: v.short_description || null,
          history: v.history || null,
          cover_image_url: v.cover_image_url || null,
        },
      });
      qc.invalidateQueries({ queryKey: ["building", id] });
      qc.invalidateQueries({ queryKey: ["admin-buildings"] });
      qc.invalidateQueries({ queryKey: ["buildings"] });
      navigate({ to: "/admin" });
    } catch (e: any) {
      setError(e.message ?? "Failed to save");
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
      alert(e.message);
    }
  }

  async function onDeleteImage(imgId: string) {
    if (!confirm("Delete this image?")) return;
    await delImg({ data: { id: imgId } });
    qc.invalidateQueries({ queryKey: ["building-images", id] });
  }

  if (isLoading || !building) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="text-2xl font-semibold mb-6">Edit building</h1>
        <BuildingForm
          initial={{
            slug: building.slug,
            name: building.name,
            address: building.address ?? "",
            year_built: building.year_built ?? "",
            architect: building.architect ?? "",
            short_description: building.short_description ?? "",
            history: building.history ?? "",
            cover_image_url: building.cover_image_url ?? "",
          }}
          submitLabel="Save changes"
          onSubmit={onSubmit}
          submitting={submitting}
          error={error}
        />

        <section className="mt-12 border-t pt-8">
          <h2 className="text-lg font-semibold mb-4">Gallery</h2>
          <div className="space-y-2 mb-4">
            {images?.map((img) => (
              <div key={img.id} className="flex items-center gap-3 rounded-md border p-2">
                <img src={img.image_url} alt="" className="h-14 w-14 rounded object-cover bg-muted" />
                <div className="flex-1 text-sm">
                  <div className="truncate text-xs text-muted-foreground">{img.image_url}</div>
                  {img.caption && <div>{img.caption}</div>}
                </div>
                <button
                  onClick={() => onDeleteImage(img.id)}
                  className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {images?.length === 0 && (
              <p className="text-sm text-muted-foreground">No gallery images yet.</p>
            )}
          </div>
          <form onSubmit={onAddImage} className="space-y-2 rounded-md border p-3 bg-muted/30">
            <input
              type="url"
              required
              placeholder="Image URL (https://…)"
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              value={newImgUrl}
              onChange={(e) => setNewImgUrl(e.target.value)}
            />
            <input
              placeholder="Caption (optional)"
              className="w-full rounded-md border px-3 py-2 text-sm bg-background"
              value={newImgCaption}
              onChange={(e) => setNewImgCaption(e.target.value)}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add image
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
