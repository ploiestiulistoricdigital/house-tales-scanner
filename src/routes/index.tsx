import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { AtomLogo } from "@/components/AtomLogo";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PartnerLogo } from "@/components/PartnerLogo";

const PARTNERS = [
  { name: "Primăria Ploiești", src: "/partners/primaria-ploiesti.jpg" },
  { name: "Consiliul Județean Prahova", src: "/partners/consiliul-judetean-prahova.jpg" },
  { name: "HEVECO", src: "/partners/heveco.jpg" },
  { name: "WAM Romania", src: "/partners/wam-romania.jpg" },
  { name: 'Biblioteca Județeană "Nicolae Iorga" Ploiești', src: "/partners/biblioteca-nicolae-iorga.jpg" },
  { name: "Muzeul Județean de Istorie și Arheologie Prahova", src: "/partners/muzeul-judetean-prahova.jpg" },
  { name: "Consproiect S.A.", src: "/partners/consproiect.jpg" },
  { name: "Elipso Design", src: "/partners/elipso-design.jpeg" },
];

const MEDIA_PARTNERS = [
  { name: "DADA TV", src: "/partners/dada-tv.jpg" },
  { name: "Ploiestii.ro", src: "/partners/ploiestii-ro.png" },
];

export const Route = createFileRoute("/")({
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

function Divider() {
  return (
    <div className="ornament-divider max-w-md mx-auto my-10">
      <span className="font-display text-accent text-xl">✦</span>
    </div>
  );
}

function Home() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <section className="relative overflow-hidden flex-1">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.13_72/0.18),transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-20 text-center">
          <Divider />

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.08] tracking-tight text-readable">
            {t("brand.title")}
          </h1>
          <p className="mt-3 font-display italic text-2xl sm:text-3xl text-primary">{t("brand.tagline")}</p>
          <p className="mt-6 text-lg sm:text-xl text-foreground/80 max-w-2xl mx-auto font-serif leading-relaxed">
            {t("landing.description")}
          </p>

          <Divider />

          <div className="flex flex-col items-center gap-2">
            <AtomLogo size="hero" alt="ATOM Ploiești" className="drop-shadow-sm" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {t("landing.atomCaption")}
            </span>
          </div>

          <Divider />

          <figure>
            <div className="aspect-video w-full rounded-md border border-border/70 overflow-hidden bg-card/40">
              <img
                src="/ploiesti-vedere-generala-1938.jpg"
                alt={t("landing.heroPhotoCaption")}
                width={1600}
                height={900}
                className="h-full w-full object-cover sepia-[0.1]"
                loading="eager"
                decoding="async"
              />
            </div>
            <figcaption className="mt-3 text-sm italic text-muted-foreground">
              {t("landing.heroPhotoCaption")}
            </figcaption>
          </figure>

          <Divider />

          <Link
            to="/patrimoniu"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-primary/60 bg-primary/5 px-8 py-4 text-base sm:text-lg font-display italic text-primary hover:bg-primary/10 transition-colors"
          >
            {t("landing.cta")} →
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
                  <PartnerLogo key={partner.name} name={partner.name} src={partner.src} />
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
                  <PartnerLogo key={partner.name} name={partner.name} src={partner.src} />
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
