import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { useI18n } from "@/lib/i18n";
import {
  ABOUT_FOUNDERS,
  ABOUT_INTRO,
  ABOUT_OBJECTIVES,
  ABOUT_OBJECTIVES_TITLE,
  ATOM_LINKS,
  JOIN_CTA,
  MOTTO,
  tr,
} from "@/content/atom";
import atomLogo from "@/assets/atom-logo.png.asset.json";

export const Route = createFileRoute("/despre")({
  head: () => ({
    meta: [
      { title: "Despre ATOM Ploiești — Poveștile Caselor" },
      {
        name: "description",
        content:
          "Societatea Culturală „ATOM” Ploiești, înființată în 2018, sprijină cercetarea istoriei urbane a Ploieștiului și publicarea de lucrări despre patrimoniul orașului.",
      },
      { property: "og:title", content: "Despre ATOM Ploiești — Poveștile Caselor" },
      {
        property: "og:description",
        content: "Misiunea și obiectivele Societății Culturale „ATOM” Ploiești.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://house-tales-scanner.lovable.app/despre" }],
  }),
  component: DesprePage,
});

function DesprePage() {
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
        <img src={atomLogo.url} alt="ATOM Ploiești" className="h-16 w-auto object-contain mb-8" />
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight">{t("about.title")}</h1>
        <p className="mt-4 text-lg text-foreground/80 font-serif italic leading-relaxed">{t("about.lead")}</p>
        <p className="mt-6 font-display text-xl text-accent-foreground">{tr(lang, MOTTO)}</p>

        <div className="mt-8 space-y-5">
          {ABOUT_INTRO.map((p, i) => (
            <p key={i} className="font-serif text-base sm:text-lg leading-relaxed text-justify indent-12">
              {tr(lang, p)}
            </p>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl sm:text-3xl font-semibold border-b border-border/70 pb-3">
          {tr(lang, ABOUT_OBJECTIVES_TITLE)}
        </h2>
        <ul className="mt-6 space-y-3">
          {ABOUT_OBJECTIVES.map((o, i) => (
            <li key={i} className="flex gap-3 font-serif text-base sm:text-lg leading-relaxed">
              <span className="mt-1 text-accent">◆</span>
              <span>{tr(lang, o)}</span>
            </li>
          ))}
        </ul>

        <p className="mt-10 font-serif text-base sm:text-lg leading-relaxed text-justify">
          {tr(lang, ABOUT_FOUNDERS)}
        </p>

        <div className="mt-12 rounded-md border border-accent/50 bg-accent/10 p-6">
          <p className="font-serif text-lg leading-relaxed">{tr(lang, JOIN_CTA)}</p>
          <a
            href={ATOM_LINKS.membership}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 min-h-11 rounded-md border border-border/70 bg-background px-4 py-2 text-base hover:bg-accent/20"
          >
            {t("about.joinBtn")} <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
