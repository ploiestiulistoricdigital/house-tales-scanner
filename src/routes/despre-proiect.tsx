import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { looksLikeHtml, sanitizeRichText } from "@/lib/rich-text";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type AboutContent = {
  title: string;
  title_en: string | null;
  title_fr: string | null;
  description: string;
  description_en: string | null;
  description_fr: string | null;
};

type TeamMember = {
  id: string;
  name: string;
  name_en: string | null;
  name_fr: string | null;
  role: string | null;
  role_en: string | null;
  role_fr: string | null;
  photo_url: string | null;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

function RichBlock({ value, className }: { value: string; className?: string }) {
  if (looksLikeHtml(value)) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeRichText(value) }} />;
  }
  return <div className={`${className ?? ""} whitespace-pre-line`}>{value}</div>;
}

function pick(
  lang: string,
  ro: string | null | undefined,
  en: string | null | undefined,
  fr: string | null | undefined,
): string | null {
  const clean = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);
  const r = clean(ro);
  const e = clean(en);
  const f = clean(fr);
  if (lang === "en") return e ?? r ?? f ?? null;
  if (lang === "fr") return f ?? r ?? e ?? null;
  return r ?? e ?? f ?? null;
}

async function loadAboutPage(): Promise<{ content: AboutContent | null; team: TeamMember[] }> {
  const [contentRes, teamRes] = await Promise.all([
    supabase.from("about_content").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("team_members")
      .select("id, name, name_en, name_fr, role, role_en, role_fr, photo_url")
      .order("sort_order")
      .order("created_at"),
  ]);
  return {
    content: contentRes.data ?? null,
    team: teamRes.data ?? [],
  };
}

export const Route = createFileRoute("/despre-proiect")({
  loader: () => loadAboutPage(),
  head: () => ({
    meta: [
      { title: "Despre proiect — Ploieștiul Istoric Digital" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DespreProiect,
});

function DespreProiect() {
  const { t, lang } = useI18n();
  const { content, team } = Route.useLoaderData();
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const selectedName = selectedMember
    ? (pick(lang, selectedMember.name, selectedMember.name_en, selectedMember.name_fr) ?? selectedMember.name)
    : null;
  const selectedRole = selectedMember ? pick(lang, selectedMember.role, selectedMember.role_en, selectedMember.role_fr) : null;

  const title = content ? pick(lang, content.title, content.title_en, content.title_fr) : null;
  const description = content ? pick(lang, content.description, content.description_en, content.description_fr) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <section className="mx-auto max-w-3xl px-4 pt-10 sm:pt-14 pb-24 flex-1 w-full">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold border-b border-border/70 pb-3 mb-8">
          {title || t("nav.despreProiect")}
        </h1>

        {description &&
          (looksLikeHtml(description) ? (
            <div
              className="rich-text-content max-w-none font-serif text-foreground text-lg leading-[1.7] mb-12"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(description) }}
            />
          ) : (
            <div className="rich-text-content max-w-none font-serif text-foreground text-lg leading-[1.7] mb-12">
              {description
                .split(/\n\s*\n/)
                .filter(Boolean)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          ))}

        {team.length > 0 && (
          <>
            <div className="ornament-divider mb-10">
              <span className="font-display text-accent text-xl">✦</span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-10">
              {team.map((member) => {
                const name = pick(lang, member.name, member.name_en, member.name_fr) ?? member.name;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedMember(member)}
                    className="flex w-28 sm:w-36 flex-col items-center text-center cursor-zoom-in group"
                  >
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt=""
                        className="h-24 w-24 rounded-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                        <User className="h-10 w-10" />
                      </div>
                    )}
                    <RichBlock value={name} className="mt-3 font-display text-base font-semibold [&_p]:m-0" />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      <Dialog open={selectedMember !== null} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-w-md">
          {selectedMember && (
            <div className="flex flex-col items-center text-center">
              <DialogTitle className="sr-only">{stripHtml(selectedName ?? selectedMember.name)}</DialogTitle>
              {selectedMember.photo_url ? (
                <img
                  src={selectedMember.photo_url}
                  alt=""
                  className="h-40 w-40 rounded-full object-cover"
                />
              ) : (
                <div className="h-40 w-40 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <User className="h-16 w-16" />
                </div>
              )}
              <RichBlock value={selectedName ?? selectedMember.name} className="mt-4 font-display text-xl font-semibold [&_p]:m-0" />
              {selectedRole && (
                <RichBlock
                  value={selectedRole}
                  className="mt-3 text-base text-muted-foreground leading-relaxed text-left [&_p]:mb-2 last:[&_p]:mb-0"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
