import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkIsAdmin, deleteBuilding, claimFirstAdmin } from "@/lib/buildings.functions";
import { Plus, Pencil, Trash2, Copy, ExternalLink, LogOut } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Building Stories" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const checkAdmin = useServerFn(checkIsAdmin);
  const deleteFn = useServerFn(deleteBuilding);
  const claimAdmin = useServerFn(claimFirstAdmin);
  const [copied, setCopied] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);

  const { data: adminCheck, isLoading: checkingAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
  });

  const { data: buildings } = useQuery({
    queryKey: ["admin-buildings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("id, slug, name, address, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: adminCheck?.isAdmin === true,
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-buildings"] });
    qc.invalidateQueries({ queryKey: ["buildings"] });
  }

  function copyUrl(slug: string) {
    const url = `${window.location.origin}/b/${slug}`;
    navigator.clipboard.writeText(url);
    setCopied(slug);
    setTimeout(() => setCopied(null), 1500);
  }

  if (checkingAdmin) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold">Not authorized</h1>
          <p className="mt-2 text-muted-foreground">
            Your account is signed in but doesn't have admin access. Ask the site owner to grant
            you the admin role.
          </p>
          <button
            onClick={signOut}
            className="mt-4 inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Buildings admin</h1>
          <div className="flex gap-2">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-foreground px-3 py-1.5"
            >
              View site
            </Link>
            <button
              onClick={signOut}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">All buildings</h2>
          <Link
            to="/admin/buildings/new"
            className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New building
          </Link>
        </div>

        {!buildings || buildings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No buildings yet. Create the first one.
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Address</th>
                  <th className="px-4 py-2 font-medium">Public URL</th>
                  <th className="px-4 py-2 font-medium w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buildings.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{b.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b.address ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">/b/{b.slug}</code>
                        <button
                          onClick={() => copyUrl(b.slug)}
                          className="p-1 hover:bg-accent rounded"
                          title="Copy URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {copied === b.slug && (
                          <span className="text-xs text-green-600">Copied!</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Link
                          to="/b/$slug"
                          params={{ slug: b.slug }}
                          className="p-1.5 hover:bg-accent rounded"
                          title="View"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Link
                          to="/admin/buildings/$id/edit"
                          params={{ id: b.id }}
                          className="p-1.5 hover:bg-accent rounded"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => onDelete(b.id, b.name)}
                          className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-8 text-xs text-muted-foreground">
          Tip: copy each building's public URL and paste it into any QR code generator (e.g.
          qrcode-monkey.com) to produce a QR sticker for the wall.
        </p>
      </div>
    </div>
  );
}
