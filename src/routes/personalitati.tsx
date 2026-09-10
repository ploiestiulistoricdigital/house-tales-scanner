import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/personalitati")({
  head: () => ({
    meta: [
      { title: "Personalități — Ploieștiul Istoric Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ComingSoonPage titleKey="nav.personalitati" />,
});
