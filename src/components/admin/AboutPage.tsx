import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin } from "@/lib/buildings.functions";
import { updateAboutContent, deleteTeamMember, reorderTeamMembers } from "@/lib/about.functions";
import { AboutContentForm, type AboutContentFormValues } from "@/components/AboutContentForm";
import { Plus, Pencil, Trash2, LogOut, GripVertical, User } from "lucide-react";
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

type TeamMemberRow = {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  sort_order: number;
};

export function AboutPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { t } = useI18n();
  const checkAdmin = useServerFn(checkIsAdmin);
  const updateContent = useServerFn(updateAboutContent);
  const deleteFn = useServerFn(deleteTeamMember);
  const reorderFn = useServerFn(reorderTeamMembers);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [members, setMembers] = useState<TeamMemberRow[]>([]);
  const [contentSubmitting, setContentSubmitting] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

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

  const { data: content } = useQuery({
    queryKey: ["admin-about-content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("about_content").select("*").eq("id", 1).single();
      if (error) throw error;
      return data;
    },
    enabled: adminCheck?.isAdmin === true,
  });

  const { data: teamMembers, isError: teamError } = useQuery({
    queryKey: ["admin-team-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("id, name, role, photo_url, sort_order")
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return data as TeamMemberRow[];
    },
    enabled: adminCheck?.isAdmin === true,
  });

  useEffect(() => {
    if (teamMembers) setMembers(teamMembers);
  }, [teamMembers]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined }, replace: true });
  }

  async function handleContentSubmit(v: AboutContentFormValues) {
    setContentSubmitting(true);
    setContentError(null);
    try {
      await updateContent({ data: v });
      toast.success(t("about.admin.saved"));
      qc.invalidateQueries({ queryKey: ["admin-about-content"] });
    } catch (e: any) {
      setContentError(e.message ?? t("form.saveFailed"));
    } finally {
      setContentSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    await deleteFn({ data: { id: pendingDelete.id } });
    setPendingDelete(null);
    qc.invalidateQueries({ queryKey: ["admin-team-members"] });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = members.findIndex((m) => m.id === active.id);
    const newIndex = members.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(members, oldIndex, newIndex);
    setMembers(reordered);
    try {
      await reorderFn({ data: { ids: reordered.map((m) => m.id) } });
      qc.invalidateQueries({ queryKey: ["admin-team-members"] });
    } catch {
      setMembers(members);
    }
  }

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
          <h1 className="text-lg sm:text-xl font-semibold">{t("about.admin.title")}</h1>
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

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-12">
        <section>
          <h2 className="text-xl sm:text-2xl font-semibold mb-4">{t("about.admin.contentSection")}</h2>
          {content && (
            <AboutContentForm
              initial={{
                title: content.title,
                title_en: content.title_en ?? "",
                title_fr: content.title_fr ?? "",
                description: content.description,
                description_en: content.description_en ?? "",
                description_fr: content.description_fr ?? "",
              }}
              onSubmit={handleContentSubmit}
              submitting={contentSubmitting}
              error={contentError}
            />
          )}
        </section>

        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h2 className="text-xl sm:text-2xl font-semibold">{t("about.admin.teamSection")}</h2>
            <Link
              to="/admin/despre-proiect/team/new"
              className="inline-flex items-center justify-center gap-1 min-h-11 rounded-md bg-primary text-primary-foreground px-4 py-2 text-base font-medium hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> {t("about.admin.addMember")}
            </Link>
          </div>

          {teamError ? (
            <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-12 text-center text-base text-destructive leading-relaxed">
              {t("admin.error")}
            </div>
          ) : members.length === 0 ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-base text-muted-foreground leading-relaxed">
              {t("about.admin.empty")}
            </div>
          ) : (
            <div className="rounded-lg border border-border/70 overflow-x-auto">
              <table className="w-full min-w-[480px] text-base">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <tbody>
                    <SortableContext items={members.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                      {members.map((member) => (
                        <SortableTeamRow
                          key={member.id}
                          member={member}
                          onDelete={() => setPendingDelete({ id: member.id, name: member.name })}
                          t={t}
                        />
                      ))}
                    </SortableContext>
                  </tbody>
                </DndContext>
              </table>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => !o && setPendingDelete(null)}
        title={t("about.admin.confirmDelete.title")}
        description={pendingDelete ? t("about.admin.confirmDelete", { name: pendingDelete.name }) : undefined}
        confirmLabel={t("common.delete")}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SortableTeamRow({
  member,
  onDelete,
  t,
}: {
  member: TeamMemberRow;
  onDelete: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: member.id });
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
      <td className="w-16 px-2 py-3">
        {member.photo_url ? (
          <img src={member.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <User className="h-5 w-5" />
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-medium">{member.name}</td>
      <td className="px-4 py-3 text-muted-foreground">{member.role || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <Link
            to="/admin/despre-proiect/team/$id/edit"
            params={{ id: member.id }}
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
