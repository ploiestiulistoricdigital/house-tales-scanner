import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { useI18n } from "@/lib/i18n";
import { NEWS, tr } from "@/content/atom";

export const Route = createFileRoute("/noutati")({
  head: () => ({
    meta: [
      { title: "Noutăți — ATOM Ploiești" },
      {
        name: "description",
        content:
          "Noutăți despre activitățile Societății Culturale ATOM Ploiești: estetica urbană, revitalizarea zonei centrale, lansări de carte și povești ale orașului.",
      },
      { property: "og:title", content: "Noutăți — ATOM Ploiești" },
      { property: "og:description", content: "Ultimele noutăți despre patrimoniul și viața culturală a Ploieștiului." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://house-tales-scanner.lovable.app/noutati" }],
  }),
  component: NoutatiPage,
});

function NoutatiPage() {
  const { t, lang } = useI18n();
  const locale = lang === "en" ? "en-GB" : lang === "fr" ? "fr-FR" : "ro-RO";
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight">{t("news.title")}</h1>
        <p className="mt-4 text-lg text-foreground/80 font-serif italic leading-relaxed">{t("news.lead")}</p>

        <div className="mt-10 space-y-6">
          {NEWS.map((n) => (
            <article key={n.url} className="rounded-md border border-border/80 bg-card p-6">
              <time dateTime={n.date} className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {new Date(n.date).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}
              </time>
              <h2 className="mt-2 font-display text-xl sm:text-2xl font-semibold leading-tight">
                {tr(lang, n.title)}
              </h2>
              <p className="mt-3 font-serif text-base sm:text-lg leading-relaxed text-justify">
                {tr(lang, n.excerpt)}
              </p>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 min-h-11 text-base text-muted-foreground hover:text-primary"
              >
                {t("news.readMore")} <ExternalLink className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground italic">{t("news.sourceNote")}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
