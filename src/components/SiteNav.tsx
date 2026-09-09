import { Link, useLocation } from "@tanstack/react-router";
import { Landmark } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.acasa" },
  { to: "/istoria-ploiestiului", labelKey: "nav.istoriaPloiestiului" },
  { to: "/patrimoniu", labelKey: "nav.patrimoniu" },
  { to: "/personalitati", labelKey: "nav.personalitati" },
  { to: "/harti", labelKey: "nav.harti" },
  { to: "/trasee", labelKey: "nav.trasee" },
  { to: "/arhiva", labelKey: "nav.arhiva" },
  { to: "/despre-proiect", labelKey: "nav.despreProiect" },
] as const;

export function SiteNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
        <Link to="/" className="flex items-center gap-2.5 min-w-0 shrink-0">
          <Landmark className="h-6 w-6 shrink-0 text-primary" />
          <div className="flex flex-col leading-none min-w-0">
            <span className="font-display text-lg sm:text-xl font-semibold tracking-wide truncate">
              {t("brand.title")}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              {t("brand.tagline")}
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1 flex-wrap order-3 sm:order-2 w-full sm:w-auto justify-center">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to as any}
                aria-current={active ? "page" : undefined}
                className={`px-3 py-2 min-h-11 inline-flex items-center text-sm uppercase tracking-wider transition-colors ${
                  active ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0 order-2 sm:order-3">
          <LanguageSwitcher />
          <Link
            to="/auth"
            search={{ next: undefined }}
            className="inline-flex items-center justify-center min-h-11 px-3 py-2 text-sm font-medium uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            {t("nav.admin")}
          </Link>
        </div>
      </div>
    </header>
  );
}
