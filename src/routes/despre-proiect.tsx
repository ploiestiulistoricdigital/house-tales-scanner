import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Mail } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { sendContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/despre-proiect")({
  head: () => ({
    meta: [
      { title: "Despre proiect — Ploieștiul Istoric Digital" },
      {
        name: "description",
        content:
          "Asociația Societatea Culturală ATOM Ploiești este inițiatoarea proiectului Ploieștiul Istoric Digital. Află mai multe și contactează-ne.",
      },
      { property: "og:title", content: "Despre proiect — Ploieștiul Istoric Digital" },
      {
        property: "og:description",
        content:
          "Asociația Societatea Culturală ATOM Ploiești este inițiatoarea proiectului Ploieștiul Istoric Digital. Află mai multe și contactează-ne.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: DespreProiect,
});

function DespreProiect() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <section className="mx-auto max-w-2xl px-4 pt-10 sm:pt-14 pb-24 flex-1 w-full">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold border-b border-border/70 pb-3 mb-8">
          {t("nav.despreProiect")}
        </h1>

        <div className="mb-12">
          <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-2">
            {t("despreProiect.org.title")}
          </h2>
          <p className="text-foreground/85 leading-relaxed mb-4">{t("despreProiect.org.body")}</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://atomploiesti.ro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4 hover:text-primary transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {t("despreProiect.org.websiteLink")}
            </a>
            <a
              href="mailto:contact@atomploiesti.ro"
              className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4 hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              contact@atomploiesti.ro
            </a>
          </div>
        </div>

        <div className="ornament-divider mb-8">
          <span className="font-display text-accent text-xl">✦</span>
        </div>

        <ContactForm />
      </section>

      <SiteFooter />
    </div>
  );
}

type Status = "idle" | "sending" | "sent";

function ContactForm() {
  const { t } = useI18n();
  const sendMessage = useServerFn(sendContactMessage);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      await sendMessage({ data: { name, email, message, honeypot } });
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
    } catch {
      // Never surface err.message here — it can carry Resend/internal detail.
      setError(t("despreProiect.contact.error"));
      setStatus("idle");
    }
  }

  return (
    <div>
      <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground mb-2">
        {t("despreProiect.contact.title")}
      </h2>
      <p className="text-foreground/85 leading-relaxed mb-6">{t("despreProiect.contact.intro")}</p>

      {status === "sent" ? (
        <p className="text-base text-primary">{t("despreProiect.contact.success")}</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background"
            type="text"
            required
            placeholder={t("despreProiect.contact.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background"
            type="email"
            required
            placeholder={t("despreProiect.contact.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <textarea
            className="w-full rounded-md border border-border/70 px-3 py-3 text-base bg-background min-h-32"
            required
            placeholder={t("despreProiect.contact.message")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {/* Honeypot: off-screen and unreachable by tab, left for bots to fill in. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-px w-px overflow-hidden"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
          {error && <p className="text-base text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full sm:w-auto min-h-11 rounded-md bg-primary text-primary-foreground px-6 py-3 text-base font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {status === "sending"
              ? t("despreProiect.contact.sending")
              : t("despreProiect.contact.submit")}
          </button>
        </form>
      )}
    </div>
  );
}
