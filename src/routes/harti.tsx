import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/harti")({
  head: () => ({
    meta: [
      { title: "Hărți — Ploieștiul Istoric Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ComingSoonPage titleKey="nav.harti" />,
});
