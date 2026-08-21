import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Landmark, ScrollText, QrCode, ChevronLeft, ChevronRight } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import atomLogo from "@/assets/atom-logo.png.asset.json";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo } from "react";

const searchSchema = z.object({
  page: fallback(z.number().int(), 1).default(1),
  perPage: fallback(z.number().int(), 6).default(6),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Poveștile Caselor — Descoperă istoria clădirilor" },
      {
        name: "description",
        content:
          "Scanează un cod QR de pe o clădire sau răsfoiește catalogul nostru pentru a descoperi istoria și poveștile caselor și clădirilor istorice.",
      },
      { property: "og:title", content: "Poveștile Caselor — Descoperă istoria clădirilor" },
      { property: "og:description", content: "Scanează un cod QR de pe o clădire sau răsfoiește catalogul nostru pentru a descoperi istoria și poveștile caselor și clădirilor istorice." },
      { property: "og:type", content: "website" },
    ],
  }),
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [stripSearchParams({ page: 1, perPage: 6 })],
  },
  component: Home,
});

const PER_PAGE_OPTIONS = [6, 12, 15];

function pick(
  lang: string,
  ro: string | null | undefined,
  en: string | null | undefined,
  fr: string | null | undefined,
): string | null {
  const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
  const r = clean(ro);
  const e = clean(en);
  const f = clean(fr);
  if (lang === "en") return e ?? r ?? f ?? null;
  if (lang === "fr") return f ?? r ?? e ?? null;
  return r ?? e ?? f ?? null;
}

function getPageNumbers(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const items: (number | string)[] = [1];
  if (current > 3) items.push("...");
  else items.push(2);
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) items.push(i);
  if (current < total - 2) items.push("...");
  else if (total - 1 > current) items.push(total - 1);
  if (!items.includes(total)) items.push(total);
  return [...new Set(items)];
}

function Home() {
  const { t, lang } = useI18n();
  const navigate = useNavigate({ from: "/" });
  const { page, perPage } = Route.useSearch();
  const safePerPage = PER_PAGE_OPTIONS.includes(perPage) ? perPage : 6;

  const { data: buildings, isLoading } = useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("id, slug, name, name_en, name_fr, address, address_en, address_fr, short_description, short_description_en, short_description_fr, cover_image_url, year_built")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const total = buildings?.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / safePerPage));
  const safePage = Math.max(1, Math.min(page, pageCount));

  const paginatedBuildings = useMemo(() => {
    if (!buildings) return [];
    const start = (safePage - 1) * safePerPage;
    return buildings.slice(start, start + safePerPage);
  }, [buildings, safePage, safePerPage]);

  useEffect(() => {
    if (page !== safePage || perPage !== safePerPage) {
      navigate({
        search: (prev) => ({ ...prev, page: safePage, perPage: safePerPage }),
        replace: true,
      });
    }
  }, [page, safePage, perPage, safePerPage, navigate]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-5 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <Landmark className="h-6 w-6 shrink-0 text-primary" />
            <div className="flex flex-col leading-none min-w-0">
              <span className="font-display text-lg sm:text-xl font-semibold tracking-wide truncate">{t("brand.title")}</span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
                {t("brand.tagline")}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2 shrink-0">
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

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.72_0.13_72/0.18),transparent_60%)]" />
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-24 text-center">
          <div className="flex justify-center mb-6">
            <img
              src={atomLogo.url}
              alt="ATOM Ploiești"
              className="h-16 sm:h-20 w-auto object-contain drop-shadow-sm"
            />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/15 px-4 py-2 text-sm uppercase tracking-[0.15em] text-accent-foreground mb-8">
            <ScrollText className="h-4 w-4" />
            {t("home.badge")}
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-semibold leading-[1.08] tracking-tight text-readable">
            {t("home.h1.a")}{" "}
            <span className="text-gradient-warm italic">{t("home.h1.b")}</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-foreground/80 max-w-2xl mx-auto font-serif leading-relaxed">
            {t("home.lead")}
          </p>
          <div className="mt-10 ornament-divider max-w-md mx-auto">
            <QrCode className="h-5 w-5" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="flex items-baseline justify-between border-b border-border/70 pb-3 mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-semibold">{t("home.archive")}</h2>
          {buildings && (
            <span className="text-sm uppercase tracking-widest text-muted-foreground">
              {buildings.length} {buildings.length === 1 ? t("home.records.one") : t("home.records.many")}
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-muted-foreground italic text-lg">{t("home.loading")}</p>
        ) : !buildings || buildings.length === 0 ? (
          <div className="rounded-md border-2 border-dashed border-border p-16 text-center text-muted-foreground italic bg-card/40 text-lg leading-relaxed">
            {t("home.empty")}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {paginatedBuildings.map((b) => {
                const name = pick(lang, b.name, b.name_en, b.name_fr) ?? b.name;
                const address = pick(lang, b.address, b.address_en, b.address_fr);
                const shortDesc = pick(lang, b.short_description, b.short_description_en, b.short_description_fr);
                return (
                  <Link
                    key={b.id}
                    to="/b/$slug"
                    params={{ slug: b.slug }}
                    className="group rounded-md overflow-hidden bg-card border border-border/80 hover:border-primary/70 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_oklch(0.35_0.12_42/0.45)]"
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                      {b.cover_image_url ? (
                        <>
                          <img
                            src={b.cover_image_url}
                            alt={name}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 sepia-[0.1] group-hover:sepia-0"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-foreground/35 via-transparent to-transparent" />
                        </>
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary">
                          <Landmark className="h-12 w-12" />
                        </div>
                      )}
                      {b.year_built && (
                        <span className="absolute top-3 right-3 rounded-sm bg-background/90 backdrop-blur px-2.5 py-1.5 text-xs font-semibold tracking-widest uppercase text-foreground border border-border/60">
                          {b.year_built}
                        </span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-xl sm:text-2xl font-semibold group-hover:text-primary transition-colors leading-tight">
                        {name}
                      </h3>
                      {address && (
                        <p className="mt-2 text-sm sm:text-base text-muted-foreground flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 shrink-0 text-accent" />
                          {address}
                        </p>
                      )}
                      {shortDesc && (
                        <p className="mt-3 text-sm sm:text-base text-muted-foreground line-clamp-2 font-serif italic leading-relaxed">
                          {shortDesc}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
            <PaginationControls page={safePage} perPage={safePerPage} total={total} pageCount={pageCount} />
          </>
        )}
      </section>

      <footer className="border-t border-border/70 bg-secondary/50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
          {t("home.footer")}
        </div>
      </footer>
    </div>
  );
}

function PaginationControls({
  page,
  perPage,
  total,
  pageCount,
}: {
  page: number;
  perPage: number;
  total: number;
  pageCount: number;
}) {
  const { t } = useI18n();
  if (total <= PER_PAGE_OPTIONS[0]) return null;

  const pageBase =
    "inline-flex items-center justify-center min-h-9 min-w-9 px-2 rounded-md border border-border/70 text-sm font-medium transition-colors hover:bg-accent/40";
  const pageActive = "bg-primary text-primary-foreground border-primary hover:bg-primary/90";
  const pageDisabled = "pointer-events-none opacity-40 cursor-default hover:bg-transparent";

  return (
    <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
      <div className="flex items-center justify-center sm:justify-start gap-2">
        <span className="text-sm text-muted-foreground">{t("home.pagination.perPage")}:</span>
        <div className="inline-flex items-center rounded-md border border-border/70 overflow-hidden text-sm">
          {PER_PAGE_OPTIONS.map((n) => {
            const active = n === perPage;
            return (
              <Link
                key={n}
                to="/"
                search={(prev) => ({ ...prev, perPage: n, page: 1 })}
                className={`px-3 py-2 min-h-9 inline-flex items-center justify-center transition-colors ${
                  active ? "bg-primary text-primary-foreground" : "hover:bg-accent/40"
                }`}
              >
                {n}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        {page <= 1 ? (
          <span className={`${pageBase} ${pageDisabled}`} aria-label={t("home.pagination.prev")}>
            <ChevronLeft className="h-4 w-4" />
          </span>
        ) : (
          <Link
            to="/"
            search={(prev) => ({ ...prev, page: page - 1 })}
            className={pageBase}
            aria-label={t("home.pagination.prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        )}

        {getPageNumbers(page, pageCount).map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm">
              …
            </span>
          ) : p === page ? (
            <span key={p} className={`${pageBase} ${pageActive}`} aria-current="page">
              {p}
            </span>
          ) : (
            <Link
              key={p}
              to="/"
              search={(prev) => ({ ...prev, page: p })}
              className={pageBase}
            >
              {p}
            </Link>
          ),
        )}

        {page >= pageCount ? (
          <span className={`${pageBase} ${pageDisabled}`} aria-label={t("home.pagination.next")}>
            <ChevronRight className="h-4 w-4" />
          </span>
        ) : (
          <Link
            to="/"
            search={(prev) => ({ ...prev, page: page + 1 })}
            className={pageBase}
            aria-label={t("home.pagination.next")}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="text-sm text-muted-foreground text-center sm:text-right">
        {t("home.pagination.pageOf", { page, total: pageCount })}
      </div>
    </div>
  );
}
