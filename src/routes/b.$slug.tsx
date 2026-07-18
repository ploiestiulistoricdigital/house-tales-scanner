import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Calendar, User } from "lucide-react";
import { useState } from "react";

type Building = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  year_built: string | null;
  architect: string | null;
  short_description: string | null;
  history: string | null;
  cover_image_url: string | null;
};

type Img = { id: string; image_url: string; caption: string | null };

async function loadBuilding(slug: string): Promise<{ building: Building; images: Img[] }> {
  const { data: building, error } = await supabase
    .from("buildings")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!building) throw notFound();
  const { data: images } = await supabase
    .from("building_images")
    .select("id, image_url, caption")
    .eq("building_id", building.id)
    .order("sort_order");
  return { building: building as Building, images: (images ?? []) as Img[] };
}

export const Route = createFileRoute("/b/$slug")({
  loader: ({ params }) => loadBuilding(params.slug),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Clădirea nu a fost găsită" }, { name: "robots", content: "noindex" }] };
    }
    const { building } = loaderData;
    const desc = building.short_description ?? `Descoperă istoria clădirii ${building.name}.`;
    return {
      meta: [
        { title: `${building.name} — Poveștile Caselor` },
        { name: "description", content: desc },
        { property: "og:title", content: building.name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        ...(building.cover_image_url
          ? [
              { property: "og:image", content: building.cover_image_url },
              { name: "twitter:image", content: building.cover_image_url },
            ]
          : []),
      ],
    };
  },
  component: BuildingPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Clădirea nu a fost găsită</h1>
        <p className="mt-2 text-muted-foreground">Acest cod QR ar putea fi învechit.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Înapoi acasă
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Pagina nu a putut fi încărcată</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
});

function BuildingPage() {
  const { building, images } = Route.useLoaderData();
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {building.cover_image_url ? (
        <div className="relative h-72 sm:h-96 w-full overflow-hidden bg-muted">
          <img
            src={building.cover_image_url}
            alt={building.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <Link
            to="/"
            className="absolute top-4 left-4 inline-flex items-center gap-1 rounded-md bg-black/40 backdrop-blur px-3 py-1.5 text-sm text-white hover:bg-black/60"
          >
            <ArrowLeft className="h-4 w-4" /> Acasă
          </Link>
          <div className="absolute bottom-6 left-4 right-4 text-white">
            <h1 className="text-3xl sm:text-4xl font-bold">{building.name}</h1>
            {building.address && (
              <p className="mt-1 flex items-center gap-1 text-sm opacity-90">
                <MapPin className="h-4 w-4" /> {building.address}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="border-b px-4 py-8">
          <div className="mx-auto max-w-3xl">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Acasă
            </Link>
            <h1 className="mt-3 text-3xl font-bold">{building.name}</h1>
            {building.address && (
              <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {building.address}
              </p>
            )}
          </div>
        </div>
      )}

      <article className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex flex-wrap gap-2 mb-6">
          {building.year_built && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
              <Calendar className="h-3 w-3" /> Construit în {building.year_built}
            </span>
          )}
          {building.architect && (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
              <User className="h-3 w-3" /> {building.architect}
            </span>
          )}
        </div>

        {building.short_description && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">
            {building.short_description}
          </p>
        )}

        {building.history && (
          <div className="prose prose-sm sm:prose-base max-w-none whitespace-pre-wrap leading-relaxed">
            {building.history}
          </div>
        )}

        {images.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Galerie</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img: Img) => (
                <button
                  key={img.id}
                  onClick={() => setLightbox(img.image_url)}
                  className="aspect-square overflow-hidden rounded-md bg-muted hover:opacity-90"
                >
                  <img
                    src={img.image_url}
                    alt={img.caption ?? ""}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          </section>
        )}
      </article>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
