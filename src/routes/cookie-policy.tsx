import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { AtomLogo } from "@/components/AtomLogo";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/cookie-policy")({
  head: () => ({
    meta: [
      { title: "Politica de cookie-uri — Poveștile Caselor" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CookiePolicyPage,
});

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-foreground/85 leading-relaxed">{body}</p>
    </div>
  );
}

function CookiePolicyPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="flex flex-col items-stretch gap-2">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-sm bg-background px-3 text-xs sm:text-sm uppercase tracking-widest text-foreground hover:bg-accent/40 border border-border/60"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span>{t("nav.backHome")}</span>
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-background px-3 border border-border/60 hover:bg-accent/40 transition-colors"
            aria-label="ATOM Ploiești"
          >
            <AtomLogo size="sm" alt="ATOM Ploiești" />
          </Link>
        </div>
        <LanguageSwitcher />
      </div>

      <article className="flex-1 mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-2">{t("cookiePolicy.title")}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t("cookiePolicy.updated")}</p>

        <p className="text-foreground/85 leading-relaxed mb-8">{t("cookiePolicy.intro")}</p>

        <div className="ornament-divider mb-8">
          <span className="font-display text-accent text-xl">✦</span>
        </div>

        <Section title={t("cookiePolicy.analytics.title")} body={t("cookiePolicy.analytics.body")} />

        <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-2">
          {t("cookiePolicy.stored.title")}
        </h2>
        <p className="text-foreground/85 leading-relaxed mb-4">{t("cookiePolicy.stored.intro")}</p>
        <ul className="list-none pl-0 mb-6 space-y-4">
          <li className="border-l-[3px] border-accent pl-4">
            <span className="block font-semibold text-foreground">{t("cookiePolicy.stored.lang.title")}</span>
            <span className="text-foreground/85 leading-relaxed">{t("cookiePolicy.stored.lang.body")}</span>
          </li>
          <li className="border-l-[3px] border-accent pl-4">
            <span className="block font-semibold text-foreground">{t("cookiePolicy.stored.session.title")}</span>
            <span className="text-foreground/85 leading-relaxed">{t("cookiePolicy.stored.session.body")}</span>
          </li>
          <li className="border-l-[3px] border-accent pl-4">
            <span className="block font-semibold text-foreground">{t("cookiePolicy.stored.consent.title")}</span>
            <span className="text-foreground/85 leading-relaxed">{t("cookiePolicy.stored.consent.body")}</span>
          </li>
        </ul>

        <Section title={t("cookiePolicy.manage.title")} body={t("cookiePolicy.manage.body")} />

        <p className="text-sm text-muted-foreground mt-10">{t("cookiePolicy.contact.body")}</p>
      </article>

      <SiteFooter />
    </div>
  );
}
