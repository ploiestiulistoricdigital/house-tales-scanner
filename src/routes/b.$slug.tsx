import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Calendar, User } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import atomLogo from "@/assets/atom-logo.png.asset.json";

type Building = {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  name_fr: string | null;
  address: string | null;
  address_en: string | null;
  address_fr: string | null;
  year_built: string | null;
  architect: string | null;
  short_description: string | null;
  short_description_en: string | null;
  short_description_fr: string | null;
  history: string | null;
  history_en: string | null;
  history_fr: string | null;
  cover_image_url: string | null;
};

function pick(
  lang: string,
  ro: string | null | undefined,
  en: string | null | undefined,
  fr: string | null | undefined,
): string | null {
  const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
  const r = clean(ro);
  const e = clean(en);
  const f = clean(fr);
  if (lang === "en") return e ?? r ?? f ?? null;
  if (lang === "fr") return f ?? r ?? e ?? null;
  return r ?? e ?? f ?? null;
}

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
  notFoundComponent: NotFoundView,
  errorComponent: ErrorView,
});

function NotFoundView() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t("building.notFound.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("building.notFound.desc")}</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          {t("nav.backHome")}
        </Link>
      </div>
    </div>
  );
}

function ErrorView({ error }: { error: Error }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t("building.error.title")}</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}

function BuildingPage() {
  const { building, images } = Route.useLoaderData();
  const [lightbox, setLightbox] = useState<string | null>(null);
  const { t, lang } = useI18n();

  const name = pick(lang, building.name, building.name_en, building.name_fr) ?? building.name;
  const address = pick(lang, building.address, building.address_en, building.address_fr);
  const shortDesc = pick(lang, building.short_description, building.short_description_en, building.short_description_fr);
  const history = pick(lang, building.history, building.history_en, building.history_fr);

  return (
    <div className="min-h-screen">
      <Link
        to="/"
        className="fixed top-4 left-4 z-50 inline-flex items-center rounded-sm bg-background/90 backdrop-blur px-3 py-2 border border-border/60 hover:bg-background transition-colors"
        aria-label="ATOM Ploiești"
      >
        <img
          src={atomLogo.url}
          alt="ATOM Ploiești"
          className="h-8 sm:h-9 w-auto object-contain"
        />
      </Link>
      <div className="fixed top-4 right-4 z-50">
        <LanguageSwitcher />
      </div>
      {building.cover_image_url ? (
        <div className="relative h-72 sm:h-80 md:h-[28rem] w-full overflow-hidden bg-muted">
          <img
            src={building.cover_image_url}
            alt={name}
            className="h-full w-full object-cover sepia-[0.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/35 to-foreground/40" />
          <Link
            to="/"
            className="absolute top-20 sm:top-24 left-4 sm:left-5 inline-flex items-center gap-1.5 rounded-sm bg-background/90 backdrop-blur px-3 py-2 text-sm uppercase tracking-widest text-foreground hover:bg-background border border-border/60 min-h-11"
          >
            <ArrowLeft className="h-4 w-4" /> {t("nav.backArchive")}
          </Link>
          <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 px-5 sm:px-6 text-background">
            <div className="mx-auto max-w-3xl">
              <span className="text-xs uppercase tracking-[0.25em] opacity-90 text-readable">{t("building.chronicle")}</span>
              <h1 className="font-display mt-2 text-3xl sm:text-5xl md:text-6xl font-semibold leading-tight text-background text-readable-strong">
                {name}
              </h1>
              {address && (
                <p className="mt-3 flex items-center gap-1.5 text-sm sm:text-base opacity-95 font-serif italic text-readable">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5" /> {address}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-border/70 px-4 py-10 sm:py-12 bg-secondary/40">
          <div className="mx-auto max-w-3xl">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm uppercase tracking-widest text-muted-foreground hover:text-primary min-h-11 py-2"
            >
              <ArrowLeft className="h-4 w-4" /> {t("nav.backArchive")}
            </Link>
            <h1 className="font-display mt-4 text-3xl sm:text-5xl font-semibold leading-tight">{name}</h1>
            {address && (
              <p className="mt-2 flex items-center gap-1.5 text-sm sm:text-base text-muted-foreground font-serif italic">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5" /> {address}
              </p>
            )}
          </div>
        </div>
      )}

      <article className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        {(building.year_built || building.architect) && (
          <div className="flex flex-wrap gap-2 mb-8">
            {building.year_built && (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-accent/50 bg-accent/15 px-3 py-2 text-sm uppercase tracking-widest text-foreground">
                <Calendar className="h-4 w-4 text-accent" /> {building.year_built}
              </span>
            )}
            {building.architect && (
              <span className="inline-flex items-center gap-1.5 rounded-sm border border-primary/40 bg-primary/8 px-3 py-2 text-sm uppercase tracking-widest text-foreground">
                <User className="h-4 w-4 text-primary" /> {building.architect}
              </span>
            )}
          </div>
        )}

        {shortDesc && (
          <p className="font-display text-xl sm:text-2xl md:text-3xl text-foreground/90 leading-snug italic mb-10 border-l-[3px] border-accent pl-5 sm:pl-6 text-justify">
            {shortDesc}
          </p>
        )}

        <div className="ornament-divider mb-10">
          <span className="font-display text-accent text-xl">✦</span>
        </div>

        {history && (
          <div className="max-w-none font-serif text-foreground text-lg sm:text-xl leading-[1.7]">
            {history
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((paragraph, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "text-justify indent-10 sm:indent-12 mb-2"
                      : "text-justify my-2"
                  }
                >
                  {paragraph}
                </p>
              ))}
          </div>
        )}

        {images.length > 0 && (
          <section className="mt-16">
            <div className="flex items-baseline justify-between border-b border-border/70 pb-3 mb-6">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold">{t("building.gallery")}</h2>
              <span className="text-sm uppercase tracking-widest text-muted-foreground">
                {images.length} {images.length === 1 ? t("building.image.one") : t("building.image.many")}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {images.map((img: Img) => (
                <div key={img.id} className="flex flex-col">
                  <button
                    onClick={() => setLightbox(img.image_url)}
                    className="aspect-square overflow-hidden rounded-sm bg-muted border border-border/70 hover:border-primary transition-all group"
                  >
                    <img
                      src={img.image_url}
                      alt={img.caption ?? ""}
                      className="h-full w-full object-cover sepia-[0.1] group-hover:sepia-0 group-hover:scale-105 transition-all duration-500"
                      loading="lazy"
                    />
                  </button>
                  {img.caption && (
                    <p className="mt-2 text-sm text-muted-foreground font-serif italic leading-snug text-center">
                      {img.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </article>

      <div className="mx-auto max-w-3xl px-4 pb-10 flex justify-center">
        <img
          src={atomLogo.url}
          alt="ATOM Ploiești"
          className="h-12 sm:h-14 w-auto object-contain opacity-80"
        />
      </div>


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
