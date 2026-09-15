import { createFileRoute } from "@tanstack/react-router";
import { HeritageListPage, fetchHeritageItems } from "@/components/HeritageListPage";

export const Route = createFileRoute("/personalitati")({
  loader: () => fetchHeritageItems("oameni_povesti"),
  head: () => ({
    meta: [
      { title: "Personalități — Ploieștiul Istoric Digital" },
      {
        name: "description",
        content: "Oameni și povești care au dat identitate orașului Ploiești.",
      },
    ],
  }),
  component: PersonalitatiPage,
});

function PersonalitatiPage() {
  return (
    <HeritageListPage
      category="oameni_povesti"
      titleKey="nav.personalitati"
      introKey="heritageItems.personalitati.intro"
      items={Route.useLoaderData()}
    />
  );
}
