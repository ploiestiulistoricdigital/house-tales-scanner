import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { HeritageListPage, fetchHeritageItems, pick } from "@/components/HeritageListPage";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { chunkRichText, sanitizeRichText, toEditableHtml } from "@/lib/rich-text";

type IstoriaArticle = {
  title: string;
  title_en: string | null;
  title_fr: string | null;
  description: string;
  description_en: string | null;
  description_fr: string | null;
  images: string[];
};

async function fetchIstoriaArticle(): Promise<IstoriaArticle | null> {
  const [contentRes, imagesRes] = await Promise.all([
    supabase.from("istoria_content").select("*").eq("id", 1).maybeSingle(),
    supabase.from("istoria_content_images").select("image_url").order("sort_order").order("created_at"),
  ]);
  if (contentRes.error) console.error(contentRes.error);
  if (imagesRes.error) console.error(imagesRes.error);
  if (!contentRes.data) return null;
  return { ...contentRes.data, images: (imagesRes.data ?? []).map((i) => i.image_url) };
}

export const Route = createFileRoute("/istoria-ploiestiului")({
  loader: async () => ({
    items: await fetchHeritageItems("locuri_disparute"),
    article: await fetchIstoriaArticle(),
  }),
  head: () => ({
    meta: [
      { title: "Istoria Ploieștiului — Ploieștiul Istoric Digital" },
      {
        name: "description",
        content: "Istoria Ploieștiului, fotografii și povești ale unor locuri și clădiri care nu mai există.",
      },
    ],
  }),
  component: IstoriaPloiestiuluiPage,
});

const PAGE_CHARS = 4000;

function IstoriaArticleView({ article }: { article: IstoriaArticle }) {
  const { t, lang } = useI18n();
  const [pageIndex, setPageIndex] = useState(0);
  const topRef = useRef<HTMLElement>(null);
  const title = pick(lang, article.title, article.title_en, article.title_fr);
  const description = pick(lang, article.description, article.description_en, article.description_fr);
  const pages = useMemo(
    () => (description ? chunkRichText(sanitizeRichText(toEditableHtml(description)), PAGE_CHARS) : []),
    [description],
  );
  if (!title && !description && article.images.length === 0) return null;

  const current = Math.min(pageIndex, Math.max(pages.length - 1, 0));
  const isLast = current >= pages.length - 1;

  function goTo(index: number) {
    setPageIndex(index);
    // The site header is sticky, so aim below it or the first lines of the
    // new page would end up hidden behind it.
    const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const top = topRef.current ? topRef.current.getBoundingClientRect().top + window.scrollY : 0;
    window.scrollTo({ top: Math.max(top - headerHeight - 16, 0), behavior: "smooth" });
  }

  return (
    <article ref={topRef} className="mb-16 sm:mb-20">
      <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
        {title || t("istoria.article.title")}
      </h1>
      {pages.length > 0 && (
        <div
          className="rich-text-content mt-6 max-w-none font-serif text-foreground text-lg sm:text-xl leading-[1.7]"
          dangerouslySetInnerHTML={{ __html: pages[current] }}
        />
      )}
      {pages.length > 1 && (
        <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label={t("home.pagination.pageOf", { page: current + 1, total: pages.length })}>
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            className="min-h-11 rounded-sm border border-border/70 px-4 text-sm uppercase tracking-widest hover:border-primary/60 disabled:opacity-40"
          >
            {t("home.pagination.prev")}
          </button>
          {pages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-current={i === current ? "page" : undefined}
              className={`min-h-11 min-w-11 rounded-sm border px-3 text-sm ${
                i === current
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/70 hover:border-primary/60"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={isLast}
            className="min-h-11 rounded-sm border border-border/70 px-4 text-sm uppercase tracking-widest hover:border-primary/60 disabled:opacity-40"
          >
            {t("home.pagination.next")}
          </button>
        </nav>
      )}
      {isLast && article.images.length > 0 && (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {article.images.map((url) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded bg-muted">
              <img
                src={url}
                alt={title ?? ""}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover sepia-[0.1]"
              />
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function IstoriaPloiestiuluiPage() {
  const { items, article } = Route.useLoaderData();
  return (
    <HeritageListPage
      category="locuri_disparute"
      titleKey="heritageItems.category.locuri_disparute"
      introKey="heritageItems.istoriaPloiestiului.intro"
      items={items}
      header={article ? <IstoriaArticleView article={article} /> : undefined}
    />
  );
}
