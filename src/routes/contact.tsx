import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Facebook, Globe, Mail, MapPin, Send } from "lucide-react";
import { SiteFooter, SiteNav } from "@/components/SiteNav";
import { useI18n } from "@/lib/i18n";
import { ATOM_LINKS } from "@/content/atom";
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
  const { t } = useI18n();
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
          {t("contact.infoTitle")}
        </h2>
        <div className="mt-6 rounded-md border border-border/80 bg-card p-5 sm:p-7">
          <p className="font-display text-xl font-semibold">{t("contact.org")}</p>
          <p className="mt-1 flex items-center gap-2 font-serif text-base text-foreground/80">
            <MapPin className="h-4 w-4 text-accent shrink-0" />
            {t("contact.city")}
          </p>
          <dl className="mt-5 space-y-3 font-serif text-base">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <dt className="flex items-center gap-2 text-foreground/70">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                {t("contact.phones")}:
              </dt>
              <dd className="flex flex-wrap gap-x-3">
                {["0733.104.814", "0762.210.142", "0723.453.184"].map((p) => (
                  <a key={p} href={`tel:+40${p.replace(/[.\s]/g, "").slice(1)}`} className="hover:text-primary">
                    {p}
                  </a>
                ))}
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="flex items-center gap-2 text-foreground/70">
                <Printer className="h-4 w-4 text-accent shrink-0" />
                {t("contact.fax")}:
              </dt>
              <dd>(+40) 0244-525.419</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="flex items-center gap-2 text-foreground/70">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                {t("contact.emailAddr")}:
              </dt>
              <dd>
                <a href="mailto:contact@atomploiesti.ro" className="hover:text-primary">
                  contact@atomploiesti.ro
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="flex items-center gap-2 text-foreground/70">
                <Globe className="h-4 w-4 text-accent shrink-0" />
                {t("contact.website")}:
              </dt>
              <dd>
                <a
                  href={ATOM_LINKS.site}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  www.atomploiesti.ro
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="flex items-center gap-2 text-foreground/70">
                <Facebook className="h-4 w-4 text-accent shrink-0" />
                {t("contact.facebook")}:
              </dt>
              <dd>
                <a
                  href={ATOM_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  /atomploiesti
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
