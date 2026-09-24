import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Mail, Paperclip, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AtomLogo } from "@/components/AtomLogo";
import { sendContactMessage } from "@/lib/contact.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Ploieștiul Istoric Digital" },
      {
        name: "description",
        content: "Ai o întrebare, o sugestie sau informații despre o clădire istorică? Contactează echipa Ploieștiul Istoric Digital.",
      },
      { property: "og:title", content: "Contact — Ploieștiul Istoric Digital" },
      {
        property: "og:description",
        content: "Ai o întrebare, o sugestie sau informații despre o clădire istorică? Contactează echipa Ploieștiul Istoric Digital.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />

      <section className="mx-auto max-w-2xl px-4 pt-10 sm:pt-14 pb-24 flex-1 w-full">
        <h1 className="font-display text-2xl sm:text-3xl font-semibold border-b border-border/70 pb-3 mb-8">
          {t("nav.contact")}
        </h1>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <AtomLogo size="sm" />
            <h2 className="font-display text-lg sm:text-xl font-semibold text-foreground">
              {t("despreProiect.org.title")}
            </h2>
          </div>
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

const MAX_ATTACHMENT_MB = 4;
const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.replace(/^data:[^,]*,/, ""));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ContactForm() {
  const { t } = useI18n();
  const sendMessage = useServerFn(sendContactMessage);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    if (picked && picked.size > MAX_ATTACHMENT_BYTES) {
      setFileError(t("despreProiect.contact.file.tooLarge", { mb: MAX_ATTACHMENT_MB }));
      setFile(null);
      e.target.value = "";
      return;
    }
    setFileError(null);
    setFile(picked);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const attachment = file
        ? { filename: file.name, contentType: file.type || undefined, base64: await readFileAsBase64(file) }
        : undefined;
      await sendMessage({ data: { name, email, message, honeypot, attachment } });
      setStatus("sent");
      setName("");
      setEmail("");
      setMessage("");
      setFile(null);
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
          <div>
            <label className="flex items-center gap-2 min-h-11 w-fit cursor-pointer rounded-md border border-border/70 bg-background px-3 py-2 text-base hover:bg-accent">
              <Paperclip className="h-4 w-4" />
              {t("despreProiect.contact.file")}
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("despreProiect.contact.file.hint", { mb: MAX_ATTACHMENT_MB })}
            </p>
            {file && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm">
                <span className="truncate max-w-[16rem]">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label={t("common.delete")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            {fileError && <p className="mt-1 text-sm text-destructive">{fileError}</p>}
          </div>
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
