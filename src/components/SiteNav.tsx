import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.acasa" },
  { to: "/istoria-ploiestiului", labelKey: "nav.istoriaPloiestiului" },
  { to: "/patrimoniu", labelKey: "nav.patrimoniu" },
  { to: "/personalitati", labelKey: "nav.personalitati" },
  { to: "/harti", labelKey: "nav.harti" },
  { to: "/trasee", labelKey: "nav.trasee" },
  { to: "/arhiva", labelKey: "nav.arhiva" },
  { to: "/despre-proiect", labelKey: "nav.despreProiect" },
  { to: "/contact", labelKey: "nav.contact" },
] as const;

export function SiteNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-0 shrink-0 -ml-4">
            <img
              src="/sigla.jpeg"
              alt=""
              onClick={
                isHome
                  ? (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setLogoPreviewOpen(true);
                    }
                  : undefined
              }
              className={`h-20 w-20 sm:h-24 sm:w-24 -my-4 shrink-0 rounded-full object-cover ${isHome ? "cursor-zoom-in" : ""}`}
            />
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-display text-lg sm:text-xl font-semibold uppercase tracking-wide truncate">
                {t("brand.title")}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                {t("brand.tagline")}
              </span>
            </div>
          </Link>

          <LanguageSwitcher />
        </div>

        <nav className="flex items-center gap-1 flex-wrap">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
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
      </div>

      {isHome && (
        <Dialog open={logoPreviewOpen} onOpenChange={setLogoPreviewOpen}>
          <DialogContent className="max-w-md p-2 bg-transparent border-none shadow-none">
            <DialogTitle className="sr-only">{t("brand.title")}</DialogTitle>
            <img src="/sigla.jpeg" alt={t("brand.title")} className="w-full h-auto rounded-full" />
          </DialogContent>
        </Dialog>
      )}
    </header>
  );
}
