import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Landmark, ScrollText, QrCode } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import atomLogo from "@/assets/atom-logo.png.asset.json";

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
  const { t } = useI18n();
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
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-5 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <Landmark className="h-6 w-6 shrink-0 text-primary" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-display text-lg sm:text-xl font-semibold tracking-wide truncate">{t("brand.title")}</span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                {t("brand.tagline")}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <Link
              to="/auth"
              className="inline-flex items-center justify-center min-h-11 px-3 py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
            >
              {t("nav.admin")}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.13_72/0.18),transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-4 py-16 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-4 py-2 text-sm uppercase tracking-[0.15em] text-accent-foreground mb-8">
            <ScrollText className="h-4 w-4" />
            {t("home.badge")}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-semibold leading-[1.08] tracking-tight text-readable">
            {t("home.h1.a")}{" "}
            <span className="text-gradient-warm italic">{t("home.h1.b")}</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-foreground/80 max-w-2xl mx-auto font-serif leading-relaxed">
            {t("home.lead")}
          </p>
          <div className="mt-10 ornament-divider max-w-md mx-auto">
            <QrCode className="h-5 w-5" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="flex items-baseline justify-between border-b border-border/70 pb-3 mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold">{t("home.archive")}</h2>
          {buildings && (
            <span className="text-sm uppercase tracking-widest text-muted-foreground">
              {buildings.length} {buildings.length === 1 ? t("home.records.one") : t("home.records.many")}
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground italic text-lg">{t("home.loading")}</p>
        ) : !buildings || buildings.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-border p-16 text-center text-muted-foreground italic bg-card/40 text-lg leading-relaxed">
            {t("home.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {buildings.map((b) => (
              <Link
                key={b.id}
                to="/b/$slug"
                params={{ slug: b.slug }}
                className="group rounded-md overflow-hidden bg-card border border-border/80 hover:border-primary/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_oklch(0.35_0.12_42/0.45)]"
              >
                <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                  {b.cover_image_url ? (
                    <>
                      <img
                        src={b.cover_image_url}
                        alt={b.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 sepia-[0.1] group-hover:sepia-0"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/35 via-transparent to-transparent" />
                    </>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary">
                      <Landmark className="h-12 w-12" />
                    </div>
                  )}
                  {b.year_built && (
                    <span className="absolute top-3 right-3 rounded-sm bg-background/90 backdrop-blur px-2.5 py-1.5 text-xs font-semibold tracking-widest uppercase text-foreground border border-border/60">
                      {b.year_built}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl sm:text-2xl font-semibold group-hover:text-primary transition-colors leading-tight">
                    {b.name}
                  </h3>
                  {b.address && (
                    <p className="mt-2 text-sm sm:text-base text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0 text-accent" />
                      {b.address}
                    </p>
                  )}
                  {b.short_description && (
                    <p className="mt-3 text-sm sm:text-base text-muted-foreground line-clamp-2 font-serif italic leading-relaxed">
                      {b.short_description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/70 bg-secondary/50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {t("home.footer")}
        </div>
      </footer>
    </div>
  );
}
