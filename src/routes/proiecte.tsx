import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, BookOpen } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { useI18n } from "@/lib/i18n";
import { FEATURED_PROJECT, VOLUMES, tr } from "@/content/atom";

export const Route = createFileRoute("/proiecte")({
  head: () => ({
    meta: [
      { title: "Proiecte și publicații — ATOM Ploiești" },
      {
        name: "description",
        content:
          "Volumele publicate de Societatea Culturală ATOM Ploiești, de la „Orașul dispărut. Ploiești” până la „Patrimoniul istoric al Ploieștiului: case, oameni și destine”.",
      },
      { property: "og:title", content: "Proiecte și publicații — ATOM Ploiești" },
      {
        property: "og:description",
        content: "Cărți și proiecte culturale dedicate istoriei și patrimoniului Ploieștiului.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: FEATURED_PROJECT.imageUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: FEATURED_PROJECT.imageUrl },
    ],
    links: [{ rel: "canonical", href: "https://house-tales-scanner.lovable.app/proiecte" }],
  }),
  component: ProiectePage,
});

function ProiectePage() {
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-12">
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight">{t("projects.title")}</h1>
        <p className="mt-4 text-lg text-foreground/80 font-serif italic leading-relaxed">{t("projects.lead")}</p>

        <section className="mt-12">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold border-b border-border/70 pb-3">
            {t("projects.featured")}
          </h2>
          <div className="mt-6 rounded-md overflow-hidden border border-border/80 bg-card">
            <img
              src={FEATURED_PROJECT.imageUrl}
              alt={FEATURED_PROJECT.title}
              className="w-full aspect-[3/2] object-cover"
              loading="lazy"
            />
            <div className="p-6">
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {FEATURED_PROJECT.year}
              </span>
              <h3 className="mt-2 font-display text-xl sm:text-2xl font-semibold leading-tight">
                {FEATURED_PROJECT.title}
              </h3>
              <div className="mt-4 space-y-4">
                {FEATURED_PROJECT.body.map((p, i) => (
                  <p key={i} className="font-serif text-base sm:text-lg leading-relaxed text-justify indent-12">
                    {tr(lang, p)}
                  </p>
                ))}
              </div>
              <a
                href={FEATURED_PROJECT.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 min-h-11 text-base text-muted-foreground hover:text-primary"
              >
                {t("projects.source")} <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="mt-14">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold border-b border-border/70 pb-3">
            {t("projects.volumes")}
          </h2>
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VOLUMES.map((v) => (
              <li
                key={`${v.title}-${v.year}`}
                className="rounded-md border border-border/80 bg-card p-5 flex gap-3"
              >
                <BookOpen className="h-5 w-5 shrink-0 text-accent mt-1" />
                <div>
                  <h3 className="font-display text-lg font-semibold leading-tight">{v.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("projects.author")}: {v.author}
                  </p>
                  <span className="mt-2 inline-block text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {v.year}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
