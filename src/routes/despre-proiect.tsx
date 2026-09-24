import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const Route = createFileRoute("/despre-proiect")({
  head: () => ({
    meta: [
      { title: "Despre proiect — Ploieștiul Istoric Digital" },
      { name: "robots", content: "noindex" },
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
      </section>

      <SiteFooter />
    </div>
  );
}
