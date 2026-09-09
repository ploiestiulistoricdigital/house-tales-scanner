import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/istoria-ploiestiului")({
  head: () => ({
    meta: [
      { title: "Istoria Ploieștiului — Ploieștiul Istoric Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ComingSoonPage titleKey="nav.istoriaPloiestiului" />,
});
