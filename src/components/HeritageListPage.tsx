import { Link } from "@tanstack/react-router";
import { ArrowRight, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import type { HeritageCategory } from "@/components/HeritageItemForm";

export type HeritageItemSummary = {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  title_fr: string | null;
  description: string | null;
  description_en: string | null;
  description_fr: string | null;
  image_url: string | null;
};

export function pick(
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

export async function fetchHeritageItems(category: HeritageCategory): Promise<HeritageItemSummary[] | null> {
  const { data, error } = await supabase
    .from("heritage_items")
    .select("id, slug, title, title_en, title_fr, description, description_en, description_fr, image_url")
    .eq("category", category)
    .order("sort_order")
    .order("created_at");
  if (error) {
    console.error(error);
    return null;
  }
  return data;
}

export function HeritageListPage({
  category,
  titleKey,
  introKey,
  items,
}: {
  category: HeritageCategory;
  titleKey: string;
  introKey: string;
  items: HeritageItemSummary[] | null;
}) {
  const { t, lang } = useI18n();
  const isError = items === null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 mx-auto max-w-6xl px-4 py-14 sm:py-20 w-full">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">{t(titleKey)}</h1>
        <p className="mt-4 text-lg text-foreground/80 font-serif leading-relaxed max-w-2xl">{t(introKey)}</p>

        <div className="mt-10">
          {isError ? (
            <div className="rounded-md border-2 border-destructive/50 p-12 text-center text-destructive italic bg-destructive/5">
              {t("heritageItems.error")}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-md border-2 border-dashed border-border p-12 text-center text-muted-foreground italic bg-card/40">
              {t("heritageItems.empty")}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {items.map((item) => {
                const title = pick(lang, item.title, item.title_en, item.title_fr) ?? item.title;
                const description = pick(lang, item.description, item.description_en, item.description_fr);
                return (
                  <Link
                    key={item.id}
                    to="/poveste/$slug"
                    params={{ slug: item.slug }}
                    className="group rounded-md overflow-hidden bg-card border border-border/80 hover:border-primary/70 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="aspect-[4/3] bg-muted overflow-hidden relative">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-700 sepia-[0.1] group-hover:sepia-0"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground bg-secondary">
                          <ScrollText className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-xl font-semibold group-hover:text-primary transition-colors leading-tight">
                        {title}
                      </h3>
                      {description && (
                        <p className="mt-3 text-sm text-muted-foreground line-clamp-2 font-serif italic leading-relaxed">
                          {description}
                        </p>
                      )}
                      <ArrowRight className="mt-3 h-4 w-4 text-primary" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
