import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/arhiva")({
  head: () => ({
    meta: [
      { title: "Arhivă — Ploieștiul Istoric Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ComingSoonPage titleKey="nav.arhiva" />,
});
