import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Building2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Building Stories — Discover the history of buildings" },
      {
        name: "description",
        content:
          "Scan a QR code on a wall or browse our catalog to discover the history and stories of buildings and historic houses.",
      },
      { property: "og:title", content: "Building Stories — Discover the history of buildings" },
      { property: "og:description", content: "Scan a QR code on a wall or browse our catalog to discover the history and stories of buildings and historic houses." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: buildings, isLoading } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("id, slug, name, address, short_description, cover_image_url, year_built")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">Building Stories</span>
          </div>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
            Admin
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-14 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Discover the story behind every wall
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Scan a QR code on a building to learn its history, or browse the catalog below.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20">
        <h2 className="text-xl font-semibold mb-6">All buildings</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !buildings || buildings.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
            No buildings yet. Sign in as an admin to add the first one.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {buildings.map((b) => (
              <Link
                key={b.id}
                to="/b/$slug"
                params={{ slug: b.slug }}
                className="group rounded-lg border overflow-hidden bg-card hover:shadow-md transition-shadow"
              >
                <div className="aspect-[4/3] bg-muted overflow-hidden">
                  {b.cover_image_url ? (
                    <img
                      src={b.cover_image_url}
                      alt={b.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                      <Building2 className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold group-hover:text-primary">{b.name}</h3>
                  {b.address && (
                    <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {b.address}
                    </p>
                  )}
                  {b.short_description && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {b.short_description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
