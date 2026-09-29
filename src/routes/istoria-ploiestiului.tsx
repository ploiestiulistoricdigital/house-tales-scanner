import { createFileRoute } from "@tanstack/react-router";
import { HeritageListPage, fetchHeritageItems } from "@/components/HeritageListPage";

export const Route = createFileRoute("/istoria-ploiestiului")({
  loader: () => fetchHeritageItems("locuri_disparute"),
  head: () => ({
    meta: [
      { title: "Locuri care au dispărut — Ploieștiul Istoric Digital" },
      {
        name: "description",
        content: "Fotografii și povești ale unor locuri și clădiri care nu mai există în Ploiești.",
      },
    ],
  }),
  component: IstoriaPloiestiuluiPage,
});

function IstoriaPloiestiuluiPage() {
  return (
    <HeritageListPage
      category="locuri_disparute"
      titleKey="heritageItems.category.locuri_disparute"
      introKey="heritageItems.istoriaPloiestiului.intro"
      items={Route.useLoaderData()}
    />
  );
}
