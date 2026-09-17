import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";
import { AtomLogo } from "@/components/AtomLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { pick } from "@/components/HeritageListPage";
import type { HeritageCategory } from "@/components/HeritageItemForm";
import { looksLikeHtml, sanitizeRichText } from "@/lib/rich-text";

type HeritageItem = {
  id: string;
  category: HeritageCategory;
  slug: string;
  title: string;
  title_en: string | null;
  title_fr: string | null;
  description: string | null;
  description_en: string | null;
  description_fr: string | null;
  image_url: string | null;
};

const CATEGORY_BACK_ROUTE: Record<HeritageCategory, "/istoria-ploiestiului" | "/personalitati" | "/arhiva" | "/"> = {
  locuri_disparute: "/istoria-ploiestiului",
  oameni_povesti: "/personalitati",
  documente_arhiva: "/arhiva",
  poveste_din_oras: "/",
};

const CATEGORY_BACK_LABEL_KEY: Record<HeritageCategory, string> = {
  locuri_disparute: "nav.istoriaPloiestiului",
  oameni_povesti: "nav.personalitati",
  documente_arhiva: "nav.arhiva",
  poveste_din_oras: "nav.acasa",
};

async function loadHeritageItem(slug: string): Promise<HeritageItem> {
  const { data, error } = await supabase
    .from("heritage_items")
    .select("id, category, slug, title, title_en, title_fr, description, description_en, description_fr, image_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw notFound();
  return data;
}

export const Route = createFileRoute("/poveste/$slug")({
  loader: ({ params }) => loadHeritageItem(params.slug),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Pagina nu a fost găsită" }, { name: "robots", content: "noindex" }] };
    }
    const desc = loaderData.description ?? undefined;
    return {
      meta: [
        { title: `${loaderData.title} — Ploieștiul Istoric Digital` },
        ...(desc ? [{ name: "description", content: desc }] : []),
        { property: "og:title", content: loaderData.title },
        ...(desc ? [{ property: "og:description", content: desc }] : []),
        { property: "og:type", content: "article" },
        ...(loaderData.image_url
          ? [
              { property: "og:image", content: loaderData.image_url },
              { name: "twitter:image", content: loaderData.image_url },
            ]
          : []),
      ],
    };
  },
  component: HeritageItemPage,
  notFoundComponent: NotFoundView,
  errorComponent: ErrorView,
});

function NotFoundView() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t("root.404.title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("root.404.desc")}</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          {t("nav.backHome")}
        </Link>
      </div>
    </div>
  );
}

function ErrorView({ error }: { error: Error }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t("root.error.title")}</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </div>
  );
}

function HeritageItemPage() {
  const item = Route.useLoaderData();
  const { t, lang } = useI18n();

  const title = pick(lang, item.title, item.title_en, item.title_fr) ?? item.title;
  const description = pick(lang, item.description, item.description_en, item.description_fr);
  const backRoute = CATEGORY_BACK_ROUTE[item.category];
  const backLabelKey = CATEGORY_BACK_LABEL_KEY[item.category];

  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-4 left-4 right-4 z-50 flex items-start justify-between gap-3">
        <div className="flex flex-col items-stretch gap-2">
          <Link
            to={backRoute}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-sm bg-background/90 backdrop-blur px-3 text-xs sm:text-sm uppercase tracking-widest text-foreground hover:bg-background border border-border/60"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t(backLabelKey)}</span>
          </Link>
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-background/90 backdrop-blur px-3 border border-border/60 hover:bg-background transition-colors"
            aria-label="ATOM Ploiești"
          >
            <AtomLogo size="sm" alt="ATOM Ploiești" />
          </Link>
        </div>
        <LanguageSwitcher />
      </div>

      {item.image_url ? (
        <div className="relative h-72 sm:h-80 md:h-[28rem] w-full overflow-hidden bg-muted">
          <img
            src={item.image_url}
            alt={title}
            width={1200}
            height={448}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover sepia-[0.1]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/35 to-foreground/40" />
          <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 px-5 sm:px-6 text-background">
            <div className="mx-auto max-w-3xl">
              <h1 className="font-display mt-2 text-3xl sm:text-5xl md:text-6xl font-semibold leading-tight text-background text-readable-strong">
                {title}
              </h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-border/70 px-4 pt-20 pb-10 sm:pt-24 sm:pb-12 bg-secondary/40">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display mt-4 text-3xl sm:text-5xl font-semibold leading-tight">{title}</h1>
          </div>
        </div>
      )}

      <article className="flex-1 mx-auto max-w-3xl px-4 py-10 sm:py-12 w-full">
        {description &&
          (looksLikeHtml(description) ? (
            <div
              className="rich-text-content max-w-none font-serif text-foreground text-lg sm:text-xl leading-[1.7]"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(description) }}
            />
          ) : (
            <div className="max-w-none font-serif text-foreground text-lg sm:text-xl leading-[1.7]">
              {description
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i} className="text-justify indent-10 sm:indent-12 mb-2">
                    {paragraph}
                  </p>
                ))}
            </div>
          ))}
      </article>

      <SiteFooter />
    </div>
  );
}
