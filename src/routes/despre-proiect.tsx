import { createFileRoute } from "@tanstack/react-router";
import { ComingSoonPage } from "@/components/ComingSoonPage";

export const Route = createFileRoute("/despre-proiect")({
  head: () => ({
    meta: [
      { title: "Despre proiect — Ploieștiul Istoric Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ComingSoonPage titleKey="nav.despreProiect" />,
});
