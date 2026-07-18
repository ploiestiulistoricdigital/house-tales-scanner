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
    <div className="min-h-screen">
      {building.cover_image_url ? (
        <div className="relative h-80 sm:h-[28rem] w-full overflow-hidden bg-muted">
          <img
            src={building.cover_image_url}
            alt={building.name}
            className="h-full w-full object-cover sepia-[0.2]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-foreground/30" />
          <Link
            to="/"
            className="absolute top-5 left-5 inline-flex items-center gap-1.5 rounded-sm bg-background/80 backdrop-blur px-3 py-1.5 text-xs uppercase tracking-widest text-foreground hover:bg-background border border-border/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Arhivă
          </Link>
          <div className="absolute bottom-8 left-0 right-0 px-6 text-background">
            <div className="mx-auto max-w-3xl">
              <span className="text-[10px] uppercase tracking-[0.3em] opacity-80">Cronica clădirii</span>
              <h1 className="font-display mt-2 text-4xl sm:text-6xl font-semibold leading-tight text-background drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                {building.name}
              </h1>
              {building.address && (
                <p className="mt-3 flex items-center gap-1.5 text-sm opacity-95 font-serif italic">
                  <MapPin className="h-4 w-4" /> {building.address}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-border/60 px-4 py-12 bg-secondary/30">
          <div className="mx-auto max-w-3xl">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Arhivă
            </Link>
            <h1 className="font-display mt-4 text-4xl sm:text-5xl font-semibold">{building.name}</h1>
            {building.address && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground font-serif italic">
                <MapPin className="h-4 w-4" /> {building.address}
              </p>
            )}
          </div>
        </div>
      )}

      <article className="mx-auto max-w-3xl px-4 py-12">
        {(building.year_built || building.architect) && (
          <div className="flex flex-wrap gap-2 mb-8">
            {building.year_built && (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs uppercase tracking-widest text-foreground">
                <Calendar className="h-3 w-3 text-accent" /> {building.year_built}
              </span>
            )}
            {building.architect && (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs uppercase tracking-widest text-foreground">
                <User className="h-3 w-3 text-primary" /> {building.architect}
              </span>
            )}
          </div>
        )}

        {building.short_description && (
          <p className="font-display text-2xl sm:text-3xl text-foreground/85 leading-snug italic mb-10 border-l-2 border-accent pl-6">
            {building.short_description}
          </p>
        )}

        <div className="ornament-divider mb-10">
          <span className="font-display text-accent text-lg">✦</span>
        </div>

        {building.history && (
          <div className="prose prose-lg max-w-none whitespace-pre-wrap leading-relaxed font-serif text-foreground/90 first-letter:font-display first-letter:text-6xl first-letter:font-semibold first-letter:text-primary first-letter:mr-2 first-letter:float-left first-letter:leading-none first-letter:mt-1">
            {building.history}
          </div>
        )}

        {images.length > 0 && (
          <section className="mt-16">
            <div className="flex items-baseline justify-between border-b border-border/60 pb-3 mb-6">
              <h2 className="font-display text-3xl font-semibold">Galerie</h2>
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                {images.length} {images.length === 1 ? "imagine" : "imagini"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img: Img) => (
                <button
                  key={img.id}
                  onClick={() => setLightbox(img.image_url)}
                  className="aspect-square overflow-hidden rounded-sm bg-muted border border-border/60 hover:border-primary transition-all group"
                >
                  <img
                    src={img.image_url}
                    alt={img.caption ?? ""}
                    className="h-full w-full object-cover sepia-[0.15] group-hover:sepia-0 group-hover:scale-105 transition-all duration-500"
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
          className="fixed inset-0 z-50 bg-foreground/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
