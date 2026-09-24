import { useState } from "react";
import { Menu } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
      <div className="mx-auto max-w-6xl px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="md:hidden -ml-2 inline-flex items-center justify-center h-11 w-11 shrink-0 text-muted-foreground hover:text-primary"
                aria-label={t("nav.openMenu")}
              >
                <Menu className="h-6 w-6" />
              </button>
              <SheetContent side="right" className="w-3/4 sm:max-w-sm flex flex-col gap-1 pt-10">
                <SheetTitle className="sr-only">{t("brand.title")}</SheetTitle>
                {NAV_ITEMS.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <SheetClose asChild key={item.to}>
                      <Link
                        to={item.to}
                        aria-current={active ? "page" : undefined}
                        className={`px-3 py-3 min-h-11 inline-flex items-center text-sm uppercase tracking-wider transition-colors ${
                          active ? "text-primary font-semibold" : "text-muted-foreground hover:text-primary"
                        }`}
                      >
                        {t(item.labelKey)}
                      </Link>
                    </SheetClose>
                  );
                })}
              </SheetContent>
            </Sheet>

            <Link to="/" className="flex items-center gap-3 min-w-0 shrink md:-ml-4">
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
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-0.5 truncate">
                  {t("brand.tagline")}
                </span>
              </div>
            </Link>
          </div>

          <LanguageSwitcher />
        </div>

        <nav className="hidden md:flex items-center gap-1 flex-wrap">
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
