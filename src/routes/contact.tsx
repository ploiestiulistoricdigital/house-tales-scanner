import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Facebook, Globe, Mail, HandCoins, Send } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { useI18n } from "@/lib/i18n";
import { ATOM_LINKS, SUPPORT_PARAGRAPHS, tr } from "@/content/atom";
import { sendContactMessage } from "@/lib/contact.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — ATOM Ploiești" },
      {
        name: "description",
        content:
          "Contactează Societatea Culturală ATOM Ploiești prin formularul de contact, Facebook sau abonare la noutăți, și susține proiectele cu 3,5% din impozitul pe venit.",
      },
      { property: "og:title", content: "Contact — ATOM Ploiești" },
      {
        property: "og:description",
        content: "Trimite-ne un mesaj, urmărește-ne sau susține proiectele noastre culturale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://house-tales-scanner.lovable.app/contact" }],
  }),
  component: ContactPage,
});

const itemClass =
  "flex items-center gap-3 rounded-md border border-border/80 bg-card px-5 py-4 min-h-11 text-base hover:border-primary/70 transition-colors";

function ContactPage() {
  const { t, lang } = useI18n();
  const send = useServerFn(sendContactMessage);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", subject: "", message: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await send({ data: form });
      toast.success(t("contact.sent"));
      setForm({ full_name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err: any) {
      toast.error(err?.message ?? t("contact.error"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight">{t("contact.title")}</h1>
        <p className="mt-4 text-lg text-foreground/80 font-serif italic leading-relaxed">{t("contact.lead")}</p>

        <h2 className="mt-10 font-display text-2xl font-semibold border-b border-border/70 pb-3">
          {t("contact.formTitle")}
        </h2>
        <form onSubmit={onSubmit} className="mt-6 space-y-5 rounded-md border border-border/80 bg-card p-5 sm:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="c-name">
                {t("contact.name")} <span className="text-muted-foreground">{t("contact.optional")}</span>
              </Label>
              <Input id="c-name" value={form.full_name} onChange={set("full_name")} autoComplete="name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">{t("contact.email")} *</Label>
              <Input
                id="c-email"
                type="email"
                required
                value={form.email}
                onChange={set("email")}
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-phone">{t("contact.phone")} *</Label>
              <Input id="c-phone" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-subject">{t("contact.subject")} *</Label>
              <Input id="c-subject" required value={form.subject} onChange={set("subject")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-message">{t("contact.message")} *</Label>
            <Textarea id="c-message" required rows={6} value={form.message} onChange={set("message")} />
          </div>
          <Button type="submit" disabled={sending} className="min-h-11 gap-2">
            <Send className="h-4 w-4" />
            {sending ? t("contact.sending") : t("contact.send")}
          </Button>
        </form>

        <h2 className="mt-14 font-display text-2xl font-semibold border-b border-border/70 pb-3">
          {t("contact.followTitle")}
        </h2>
        <p className="mt-4 font-serif text-base sm:text-lg leading-relaxed">{t("contact.followLead")}</p>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href={ATOM_LINKS.emailSubscribe} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <Mail className="h-5 w-5 text-accent shrink-0" />
            <span className="flex-1">{t("contact.subscribe")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a href={ATOM_LINKS.facebook} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <Facebook className="h-5 w-5 text-accent shrink-0" />
            <span className="flex-1">{t("contact.facebook")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a href={ATOM_LINKS.site} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <Globe className="h-5 w-5 text-accent shrink-0" />
            <span className="flex-1">{t("contact.site")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a href={ATOM_LINKS.membership} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <HandCoins className="h-5 w-5 text-accent shrink-0" />
            <span className="flex-1">{t("about.joinBtn")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        <h2 className="mt-14 font-display text-2xl font-semibold border-b border-border/70 pb-3">
          {t("contact.support")}
        </h2>
        <div className="mt-6 space-y-4">
          {SUPPORT_PARAGRAPHS.map((p, i) => (
            <p key={i} className="font-serif text-base sm:text-lg leading-relaxed text-justify">
              {tr(lang, p)}
            </p>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a href={ATOM_LINKS.form230} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <span className="flex-1">{t("contact.form230")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
          <a href={ATOM_LINKS.declaratieUnica} target="_blank" rel="noopener noreferrer" className={itemClass}>
            <span className="flex-1">{t("contact.declaration")}</span>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
