import { createFileRoute } from "@tanstack/react-router";
import { HeritageListPage, fetchHeritageItems } from "@/components/HeritageListPage";

export const Route = createFileRoute("/arhiva")({
  loader: () => fetchHeritageItems("documente_arhiva"),
  head: () => ({
    meta: [
      { title: "Arhivă — Ploieștiul Istoric Digital" },
      {
        name: "description",
        content: "Fotografii, hărți și documente originale din arhiva Ploieștiului.",
      },
    ],
  }),
  component: ArhivaPage,
});

function ArhivaPage() {
  return (
    <HeritageListPage
      category="documente_arhiva"
      titleKey="nav.arhiva"
      introKey="heritageItems.arhiva.intro"
      items={Route.useLoaderData()}
    />
  );
}
