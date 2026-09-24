import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AtomLogo } from "@/components/AtomLogo";

export const Route = createFileRoute("/despre-proiect")({
  head: () => ({
    meta: [
      { title: "Despre proiect — Ploieștiul Istoric Digital" },
      {
        name: "description",
        content: "Asociația Societatea Culturală ATOM Ploiești este inițiatoarea proiectului Ploieștiul Istoric Digital.",
      },
      { property: "og:title", content: "Despre proiect — Ploieștiul Istoric Digital" },
      {
        property: "og:description",
        content: "Asociația Societatea Culturală ATOM Ploiești este inițiatoarea proiectului Ploieștiul Istoric Digital.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DespreProiect,
});

function DespreProiect() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <section className="mx-auto max-w-2xl px-4 pt-10 sm:pt-14 pb-24 flex-1 w-full">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold border-b border-border/70 pb-3 mb-8">
          {t("nav.despreProiect")}
        </h1>

        <div>
          <div className="flex items-center gap-3 mb-2">
            <AtomLogo size="sm" />
            <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground">
              {t("despreProiect.org.title")}
            </h2>
          </div>
          <p className="text-foreground/85 leading-relaxed">{t("despreProiect.org.body")}</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
