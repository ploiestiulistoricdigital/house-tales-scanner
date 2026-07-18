import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Landmark, ScrollText, QrCode } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Poveștile Caselor — Descoperă istoria clădirilor" },
      {
        name: "description",
        content:
          "Scanează un cod QR de pe o clădire sau răsfoiește catalogul nostru pentru a descoperi istoria și poveștile caselor și clădirilor istorice.",
      },
      { property: "og:title", content: "Poveștile Caselor — Descoperă istoria clădirilor" },
      { property: "og:description", content: "Scanează un cod QR de pe o clădire sau răsfoiește catalogul nostru pentru a descoperi istoria și poveștile caselor și clădirilor istorice." },
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
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <Landmark className="h-6 w-6 text-primary" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-semibold tracking-wide">Poveștile Caselor</span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
                Arhivă urbană
              </span>
            </div>
          </Link>
          <Link
            to="/auth"
            className="text-xs uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
          >
            Administrare
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.13_72/0.15),transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-4 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-accent-foreground/80 mb-8">
            <ScrollText className="h-3.5 w-3.5" />
            Cronica clădirilor
          </div>
          <h1 className="font-display text-5xl sm:text-7xl font-semibold leading-[1.05] tracking-tight">
            Descoperă povestea din spatele{" "}
            <span className="text-gradient-warm italic">fiecărui zid</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-serif leading-relaxed">
            Fiecare piatră a orașului poartă o memorie. Scanează un cod QR de pe fațadă sau
            răsfoiește arhiva pentru a intra în cronica urbană a clădirilor istorice.
          </p>
          <div className="mt-10 ornament-divider max-w-md mx-auto">
            <QrCode className="h-4 w-4" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="flex items-baseline justify-between border-b border-border/60 pb-3 mb-8">
          <h2 className="font-display text-3xl font-semibold">Arhiva clădirilor</h2>
          {buildings && (
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              {buildings.length} {buildings.length === 1 ? "înregistrare" : "înregistrări"}
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground italic">Se răsfoiesc filele arhivei…</p>
        ) : !buildings || buildings.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-border p-16 text-center text-muted-foreground italic bg-card/40">
            Arhiva este încă goală. Autentifică-te ca administrator pentru a adăuga prima cronică.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {buildings.map((b) => (
              <Link
                key={b.id}
                to="/b/$slug"
                params={{ slug: b.slug }}
                className="group rounded-md overflow-hidden bg-card border border-border/70 hover:border-primary/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_oklch(0.35_0.12_42/0.4)]"
              >
                <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                  {b.cover_image_url ? (
                    <>
                      <img
                        src={b.cover_image_url}
                        alt={b.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 sepia-[0.15] group-hover:sepia-0"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary">
                      <Landmark className="h-12 w-12" />
                    </div>
                  )}
                  {b.year_built && (
                    <span className="absolute top-3 right-3 rounded-sm bg-background/85 backdrop-blur px-2.5 py-1 text-[10px] font-medium tracking-widest uppercase text-foreground border border-border/60">
                      {b.year_built}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors">
                    {b.name}
                  </h3>
                  {b.address && (
                    <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      {b.address}
                    </p>
                  )}
                  {b.short_description && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2 font-serif italic leading-relaxed">
                      {b.short_description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60 bg-secondary/40 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-xs uppercase tracking-[0.25em] text-muted-foreground">
          Poveștile Caselor · Memoria orașului
        </div>
      </footer>
    </div>
  );
}
