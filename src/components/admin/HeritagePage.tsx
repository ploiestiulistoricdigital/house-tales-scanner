import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/buildings.functions";
import { deleteHeritageItem, reorderHeritageItems } from "@/lib/heritage-items.functions";
import { Plus, Pencil, Trash2, ExternalLink, LogOut, GripVertical } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { HERITAGE_CATEGORIES, type HeritageCategory } from "@/components/HeritageItemForm";

type AdminHeritageItem = {
  id: string;
  category: string;
  slug: string;
  title: string;
  sort_order: number;
  updated_at: string;
};

export function HeritagePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const checkAdmin = useServerFn(checkIsAdmin);
  const deleteFn = useServerFn(deleteHeritageItem);
  const reorderFn = useServerFn(reorderHeritageItems);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [categorized, setCategorized] = useState<Record<string, AdminHeritageItem[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) return { isAdmin: false };
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      if (data) return { isAdmin: true };
      try {
        return await checkAdmin();
      } catch {
        return { isAdmin: false };
      }
    },
  });

  const { data: items, isError: itemsError } = useQuery({
    queryKey: ["admin-heritage-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("heritage_items")
        .select("id, category, slug, title, sort_order, updated_at")
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data as AdminHeritageItem[];
    },
    enabled: adminCheck?.isAdmin === true,
  });

  useEffect(() => {
    if (!items) return;
    const grouped: Record<string, AdminHeritageItem[]> = {};
    for (const category of HERITAGE_CATEGORIES) grouped[category] = [];
    for (const item of items) (grouped[item.category] ??= []).push(item);
    setCategorized(grouped);
  }, [items]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined }, replace: true });
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteFn({ data: { id: pendingDelete.id } });
    setPendingDelete(null);
    qc.invalidateQueries({ queryKey: ["admin-heritage-items"] });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const category = Object.keys(categorized).find((cat) =>
      categorized[cat].some((i) => i.id === active.id),
    );
    if (!category) return;
    const rows = categorized[category];
    const oldIndex = rows.findIndex((i) => i.id === active.id);
    const newIndex = rows.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(rows, oldIndex, newIndex);
    setCategorized((prev) => ({ ...prev, [category]: reordered }));
    try {
      await reorderFn({ data: { ids: reordered.map((i) => i.id) } });
      qc.invalidateQueries({ queryKey: ["admin-heritage-items"] });
    } catch {
      setCategorized((prev) => ({ ...prev, [category]: rows }));
    }
  }

  const detailRouteFor: Record<string, "/istoria-ploiestiului" | "/personalitati" | "/arhiva" | "/"> = {
    locuri_disparute: "/istoria-ploiestiului",
    oameni_povesti: "/personalitati",
    documente_arhiva: "/arhiva",
    poveste_din_oras: "/",
  };

  if (checkingAdmin) {
    return <div className="p-8 text-muted-foreground">{t("admin.loading")}</div>;
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="fixed top-4 right-4">
          <LanguageSwitcher />
        </div>
        <div className="text-center max-w-md">
          <h1 className="text-2xl sm:text-3xl font-semibold">{t("admin.unauthorized.title")}</h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">{t("admin.unauthorized.desc")}</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md border px-4 py-2 text-base hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> {t("nav.signOut")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
          <h1 className="text-lg sm:text-xl font-semibold">{t("heritageItems.admin.title")}</h1>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/admin"
              className="text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center"
            >
              {t("admin.all")}
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 min-h-11 rounded-md border px-3 py-2 text-sm sm:text-base hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> {t("nav.signOut")}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold">{t("heritageItems.admin.all")}</h2>
          <Link
            to="/admin/heritage/new"
            className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> {t("heritageItems.admin.new")}
          </Link>
        </div>

        {itemsError ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center text-base text-destructive leading-relaxed">
            {t("admin.error")}
          </div>
        ) : !items || items.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-base text-muted-foreground leading-relaxed">
            {t("heritageItems.admin.empty")}
          </div>
        ) : (
          <div className="rounded-lg border border-border/70 overflow-x-auto">
            <table className="w-full min-w-[640px] text-base">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                {HERITAGE_CATEGORIES.map((category) => {
                  const rows = categorized[category] ?? [];
                  if (rows.length === 0) return null;
                  return (
                    <tbody key={category}>
                      <tr className="border-t border-border/70 bg-muted/30">
                        <td colSpan={5} className="px-4 py-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                          {t(`heritageItems.category.${category}`)}
                        </td>
                      </tr>
                      <SortableContext items={rows.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                        {rows.map((item, index) => (
                          <SortableHeritageRow
                            key={item.id}
                            item={item}
                            displayOrder={index}
                            detailRoute={detailRouteFor[item.category as HeritageCategory]}
                            onDelete={() => setPendingDelete({ id: item.id, title: item.title })}
                            t={t}
                          />
                        ))}
                      </SortableContext>
                    </tbody>
                  );
                })}
              </DndContext>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("admin.confirmDelete.title")}
        description={pendingDelete ? t("admin.confirmDelete", { name: pendingDelete.title }) : undefined}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SortableHeritageRow({
  item,
  displayOrder,
  detailRoute,
  onDelete,
  t,
}: {
  item: AdminHeritageItem;
  displayOrder: number;
  detailRoute: "/istoria-ploiestiului" | "/personalitati" | "/arhiva" | "/";
  onDelete: () => void;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-t border-border/70 bg-background">
      <td className="w-10 px-2 py-3">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t("admin.dragToReorder")}
          title={t("admin.dragToReorder")}
          className="touch-none p-2 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3 font-medium">{item.title}</td>
      <td className="px-4 py-3">
        <code className="text-sm bg-muted px-2 py-1 rounded">{item.slug}</code>
      </td>
      <td className="px-4 py-3 text-center text-muted-foreground" title={t("heritageItems.field.sortOrder")}>
        {displayOrder}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link
            to={detailRoute}
            className="p-2 hover:bg-accent rounded inline-flex items-center justify-center"
            aria-label={t("admin.viewPublic")}
            title={t("admin.view")}
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
          <Link
            to="/admin/heritage/$id/edit"
            params={{ id: item.id }}
            className="p-2 hover:bg-accent rounded inline-flex items-center justify-center"
            aria-label={t("admin.edit")}
            title={t("admin.edit")}
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded inline-flex items-center justify-center"
            aria-label={t("admin.delete")}
            title={t("admin.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
