import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, FileText, Landmark, ScrollText, Users, Compass } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AtomLogo } from "@/components/AtomLogo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PartnerLogo } from "@/components/PartnerLogo";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

type BuildingSummary = {
  id: string;
  slug: string;
  name: string;
  name_en: string | null;
  name_fr: string | null;
  short_description: string | null;
  short_description_en: string | null;
  short_description_fr: string | null;
  cover_image_url: string | null;
};

async function fetchFeaturedBuildings(): Promise<BuildingSummary[] | null> {
  const { data, error } = await supabase
    .from("buildings")
    .select("id, slug, name, name_en, name_fr, short_description, short_description_en, short_description_fr, cover_image_url")
    .order("name")
    .limit(4);
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

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

const PARTNERS = [
  { name: "Primăria Ploiești", src: "/partners/primaria-ploiesti.jpg", href: "https://ploiesti.ro/" },
  { name: "Consiliul Județean Prahova", src: "/partners/consiliul-judetean-prahova.jpg", href: "https://cjph.ro/" },
  {
    name: 'Biblioteca Județeană "Nicolae Iorga" Ploiești',
    src: "/partners/biblioteca-nicolae-iorga.jpg",
    href: "https://bibliotecaprahova.ro/",
  },
  {
    name: "Muzeul Județean de Istorie și Arheologie Prahova",
    src: "/partners/muzeul-judetean-prahova.jpg",
    href: "https://muzeuldeistorieprahova.ro/",
  },
  { name: "HEVECO", src: "/partners/heveco.jpg", href: "https://heveco.ro/" },
  { name: "WAM Romania", src: "/partners/wam-romania.jpg", href: "https://wamgroup.ro/ro/wamro/home" },
  { name: "Consproiect S.A.", src: "/partners/consproiect.jpg", href: "https://www.consproiect.ro/" },
  { name: "Elipso Design", src: "/partners/elipso-design.jpeg", href: "https://www.elipsodesign.ro/" },
];

const MEDIA_PARTNERS = [
  { name: "DADA TV", src: "/partners/dada-tv.jpg", href: "https://dadatv.ro/" },
  { name: "Ploiestii.ro", src: "/partners/ploiestii-ro.png", href: "https://ploiestii.ro/" },
];

export const Route = createFileRoute("/")({
  loader: () => fetchFeaturedBuildings(),
  head: () => ({
    meta: [
      { title: "Ploieștiul Istoric Digital — Memoria orașului în spațiul digital" },
      {
        name: "description",
        content:
          "Descoperă istoria Ploieștiului prin clădiri, oameni, hărți și documente, într-o călătorie digitală prin trecutul unui oraș cu o moștenire remarcabilă.",
      },
      {
        property: "og:title",
        content: "Ploieștiul Istoric Digital — Memoria orașului în spațiul digital",
      },
      {
        property: "og:description",
        content:
          "Descoperă istoria Ploieștiului prin clădiri, oameni, hărți și documente, într-o călătorie digitală prin trecutul unui oraș cu o moștenire remarcabilă.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Home,
});

function Home() {
  const { t, lang } = useI18n();
  const buildings = Route.useLoaderData();
  const categoryBuildings = buildings?.slice(0, 3) ?? [];
  const categoryDefs = [
    { titleKey: "landing.categories.card1.title", descKey: "landing.categories.card1.desc", icon: Landmark },
    { titleKey: "landing.categories.card2.title", descKey: "landing.categories.card2.desc", icon: Users },
    { titleKey: "landing.categories.card3.title", descKey: "landing.categories.card3.desc", icon: FileText },
  ];
  const storyBuilding = buildings?.[3] ?? buildings?.[0];
  const storyExcerpt = storyBuilding
    ? pick(lang, storyBuilding.short_description, storyBuilding.short_description_en, storyBuilding.short_description_fr)
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src="/ploiesti-vedere-generala-1938.jpg"
            alt=""
            width={1600}
            height={900}
            className="h-full w-full object-cover sepia-[0.25]"
            loading="eager"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/45 to-foreground/20" />
        </div>
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28 md:py-36">
          <div className="max-w-2xl">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.08] tracking-tight text-background text-readable-strong">
              {t("brand.title")}
            </h1>
            <p className="mt-3 font-display italic text-2xl sm:text-3xl text-background/95 text-readable-strong">
              {t("brand.tagline")}
            </p>
            <p className="mt-6 text-lg sm:text-xl text-background/90 max-w-xl font-serif leading-relaxed text-readable-strong">
              {t("landing.description")}
            </p>
            <Link
              to="/patrimoniu"
              className="mt-10 inline-flex items-center gap-2 justify-center min-h-11 px-6 py-3 rounded-sm bg-primary text-primary-foreground text-base font-display italic hover:bg-primary/90 transition-colors"
            >
              {t("landing.cta")} →
            </Link>
          </div>
        </div>
        <span className="absolute bottom-4 right-4 text-sm italic text-background/85 text-readable-strong">
          {t("landing.heroPhotoCaption")}
        </span>
      </section>

      <section className="border-t border-border/70 py-10">
        <div className="mx-auto max-w-4xl px-4 flex flex-col items-center gap-2 text-center">
          <AtomLogo size="md" alt="ATOM Ploiești" className="drop-shadow-sm" />
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {t("landing.atomCaption")}
          </span>
        </div>
      </section>

      {categoryBuildings.length > 0 && (
        <section className="border-t border-border/70 mx-auto max-w-6xl px-4 py-16 sm:py-24 w-full">
          <div className="ornament-divider mb-10">
            <span className="text-xs uppercase tracking-[0.25em] text-accent whitespace-nowrap">
              {t("landing.categories.eyebrow")}
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-10 items-start">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight">
                {t("landing.categories.title.a")} {t("landing.categories.title.b")}
              </h2>
              <p className="mt-4 text-foreground/80 font-serif leading-relaxed">{t("landing.categories.lead")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {categoryDefs.map((def, i) => {
                const b = categoryBuildings[i];
                const Icon = def.icon;
                return (
                  <Link
                    key={def.titleKey}
                    to="/patrimoniu"
                    className="group rounded-md overflow-hidden bg-card border border-border/80 hover:border-primary/70 transition-all duration-300"
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                      {b?.cover_image_url ? (
                        <img
                          src={b.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 sepia-[0.15] group-hover:sepia-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary">
                          <Icon className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-base font-semibold uppercase tracking-wide group-hover:text-primary transition-colors">
                        {t(def.titleKey)}
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(def.descKey)}</p>
                      <ArrowRight className="mt-3 h-4 w-4 text-primary" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <Link
              to="/patrimoniu"
              className="inline-flex items-center gap-2 justify-center min-h-11 px-5 py-2.5 rounded-md border border-primary/60 text-primary text-sm font-medium uppercase tracking-wider hover:bg-primary/10 transition-colors"
            >
              {t("landing.categories.cta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      <section className="border-t border-border/70 bg-secondary/40 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-10 items-center">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-accent">{t("landing.compare.eyebrow")}</span>
            <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight">
              {t("landing.compare.title.a")} <br className="hidden sm:block" /> {t("landing.compare.title.b")}
            </h2>
            <p className="mt-4 text-foreground/80 font-serif leading-relaxed">{t("landing.compare.lead")}</p>
          </div>
          <BeforeAfterSlider
            beforeSrc="/ploiesti-vedere-generala-1938.jpg"
            beforeLabel={t("landing.compare.then")}
            afterLabel={t("landing.compare.now")}
            afterPlaceholder={t("landing.compare.now.comingSoon")}
          />
        </div>
      </section>

      {storyBuilding && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:py-24 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-8 items-center">
            <div className="aspect-[4/3] rounded-md overflow-hidden bg-muted border border-border/70 shadow-[var(--shadow-warm)]">
              {storyBuilding.cover_image_url ? (
                <img
                  src={storyBuilding.cover_image_url}
                  alt=""
                  className="h-full w-full object-cover sepia-[0.15]"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary">
                  <ScrollText className="h-10 w-10" />
                </div>
              )}
            </div>
            <div>
              <span className="text-xs uppercase tracking-[0.25em] text-accent">{t("landing.story.eyebrow")}</span>
              <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight">
                {pick(lang, storyBuilding.name, storyBuilding.name_en, storyBuilding.name_fr) ?? storyBuilding.name}
              </h2>
              {storyExcerpt && (
                <p className="mt-4 text-foreground/80 font-serif italic leading-relaxed line-clamp-3">
                  {storyExcerpt}
                </p>
              )}
              <Link
                to="/b/$slug"
                params={{ slug: storyBuilding.slug }}
                className="mt-6 inline-flex items-center gap-2 justify-center min-h-11 px-5 py-2.5 rounded-md border border-primary/60 text-primary text-sm font-medium uppercase tracking-wider hover:bg-primary/10 transition-colors"
              >
                {t("landing.story.cta")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <section className="relative overflow-hidden bg-foreground text-background py-16 sm:py-24">
        <Compass className="absolute -right-8 -bottom-8 h-48 w-48 sm:h-64 sm:w-64 text-background/10" strokeWidth={0.75} />
        <div className="relative mx-auto max-w-6xl px-4">
          <span className="text-xs uppercase tracking-[0.25em] text-accent">{t("landing.map.eyebrow")}</span>
          <h2 className="mt-3 font-display text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight max-w-lg">
            {t("landing.map.title")}
          </h2>
          <p className="mt-4 text-background/80 font-serif leading-relaxed max-w-lg">{t("landing.map.lead")}</p>
          <Link
            to="/harti"
            className="mt-8 inline-flex items-center gap-2 justify-center min-h-11 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium uppercase tracking-wider hover:bg-primary/90 transition-colors"
          >
            {t("landing.map.cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="border-t border-border/70 bg-secondary/30 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-8 items-start">
            <div>
              <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4 text-center sm:text-left">
                {t("landing.partners.title")}
              </h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                {PARTNERS.map((partner) => (
                  <PartnerLogo key={partner.name} name={partner.name} src={partner.src} href={partner.href} />
                ))}
              </div>
            </div>
            <div className="hidden sm:block w-px bg-border/70 self-stretch" />
            <div>
              <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4 text-center sm:text-left">
                {t("landing.partnersMedia.title")}
              </h2>
              <div className="flex flex-wrap justify-center sm:justify-start gap-3">
                {MEDIA_PARTNERS.map((partner) => (
                  <PartnerLogo key={partner.name} name={partner.name} src={partner.src} href={partner.href} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
