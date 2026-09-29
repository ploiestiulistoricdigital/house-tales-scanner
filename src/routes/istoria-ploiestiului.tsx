import { createFileRoute } from "@tanstack/react-router";
import { HeritageListPage, fetchHeritageItems, pick } from "@/components/HeritageListPage";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { looksLikeHtml, sanitizeRichText } from "@/lib/rich-text";

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

function IstoriaArticleView({ article }: { article: IstoriaArticle }) {
  const { t, lang } = useI18n();
  const title = pick(lang, article.title, article.title_en, article.title_fr);
  const description = pick(lang, article.description, article.description_en, article.description_fr);
  if (!title && !description && article.images.length === 0) return null;

  return (
    <article className="mb-16 sm:mb-20">
      <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold leading-tight">
        {title || t("istoria.article.title")}
      </h1>
      {description &&
        (looksLikeHtml(description) ? (
          <div
            className="rich-text-content mt-6 max-w-none font-serif text-foreground text-lg sm:text-xl leading-[1.7]"
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(description) }}
          />
        ) : (
          <div className="rich-text-content mt-6 max-w-none font-serif text-foreground text-lg sm:text-xl leading-[1.7]">
            {description
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
        ))}
      {article.images.length > 0 && (
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
