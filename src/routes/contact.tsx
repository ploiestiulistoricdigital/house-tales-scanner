import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Facebook, Globe, Mail, HandCoins } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { useI18n } from "@/lib/i18n";
import { ATOM_LINKS, SUPPORT_PARAGRAPHS, tr } from "@/content/atom";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — ATOM Ploiești" },
      {
        name: "description",
        content:
          "Contactează Societatea Culturală ATOM Ploiești: formular de contact, Facebook, site oficial și modalități de susținere prin 3,5% din impozitul pe venit.",
      },
      { property: "og:title", content: "Contact — ATOM Ploiești" },
      { property: "og:description", content: "Scrie-ne, urmărește-ne sau susține proiectele noastre culturale." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://house-tales-scanner.lovable.app/contact" }],
  }),
  component: ContactPage,
});

const itemClass =
  "flex items-center gap-3 rounded-md border border-border/80 bg-card px-5 py-4 min-h-11 text-base hover:border-primary/70 transition-colors";

function ContactPage() {
  const { t, lang } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight">{t("contact.title")}</h1>
        <p className="mt-4 text-lg text-foreground/80 font-serif italic leading-relaxed">{t("contact.lead")}</p>

        <h2 className="mt-10 font-display text-2xl font-semibold border-b border-border/70 pb-3">
          {t("contact.channels")}
        </h2>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href={ATOM_LINKS.contactForm} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <Mail className="h-5 w-5 text-accent shrink-0" />
            <span className="flex-1">{t("contact.form")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a href={ATOM_LINKS.facebook} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <Facebook className="h-5 w-5 text-accent shrink-0" />
            <span className="flex-1">{t("contact.facebook")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a href={ATOM_LINKS.site} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <Globe className="h-5 w-5 text-accent shrink-0" />
            <span className="flex-1">{t("contact.site")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a href={ATOM_LINKS.membership} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <HandCoins className="h-5 w-5 text-accent shrink-0" />
            <span className="flex-1">{t("about.joinBtn")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        <h2 className="mt-14 font-display text-2xl font-semibold border-b border-border/70 pb-3">
          {t("contact.support")}
        </h2>
        <div className="mt-6 space-y-4">
          {SUPPORT_PARAGRAPHS.map((p, i) => (
            <p key={i} className="font-serif text-base sm:text-lg leading-relaxed text-justify">
              {tr(lang, p)}
            </p>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href={ATOM_LINKS.form230} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <span className="flex-1">{t("contact.form230")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a href={ATOM_LINKS.declaratieUnica} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <span className="flex-1">{t("contact.declaration")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
