import { Link } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

const linkClass =
  "inline-flex items-center min-h-11 px-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors";

export function SiteNav() {
  const { t } = useI18n();
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <Landmark className="h-6 w-6 shrink-0 text-primary" />
          <span className="font-display text-lg sm:text-xl font-semibold tracking-wide truncate">
            {t("brand.title")}
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-x-1">
          <Link to="/" className={linkClass}>
            {t("nav.archiveLink")}
          </Link>
          <Link to="/despre" className={linkClass} activeProps={{ className: `${linkClass} text-primary` }}>
            {t("nav.about")}
          </Link>
          <Link to="/proiecte" className={linkClass} activeProps={{ className: `${linkClass} text-primary` }}>
            {t("nav.projects")}
          </Link>
          <Link to="/noutati" className={linkClass} activeProps={{ className: `${linkClass} text-primary` }}>
            {t("nav.news")}
          </Link>
          <Link to="/contact" className={linkClass} activeProps={{ className: `${linkClass} text-primary` }}>
            {t("nav.contact")}
          </Link>
          <LanguageSwitcher className="ml-2" />
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/70 bg-secondary/50 py-8">
      <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-3 text-center">
        <nav className="flex flex-wrap justify-center gap-x-4">
          <Link to="/despre" className={linkClass}>
            {t("nav.about")}
          </Link>
          <Link to="/proiecte" className={linkClass}>
            {t("nav.projects")}
          </Link>
          <Link to="/noutati" className={linkClass}>
            {t("nav.news")}
          </Link>
          <Link to="/contact" className={linkClass}>
            {t("nav.contact")}
          </Link>
        </nav>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">{t("home.footer")}</p>
      </div>
    </footer>
  );
}
