# Despre proiect page + contact form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the `/despre-proiect` stub into a real page with information about Asociația Societatea Culturală ATOM Ploiești and a contact form that emails `contact@atomploiesti.ro` via Resend.

**Architecture:** A public (unauthenticated), rate-limited TanStack Start server function (`sendContactMessage`) sends the email via a raw `fetch` to Resend's REST API. The route component gets a real page body (about section + form) in place of `ComingSoonPage`, styled to match the existing `patrimoniu.tsx` page shell. All copy is added to the existing `src/lib/i18n.tsx` dictionaries.

**Tech Stack:** TanStack Start `createServerFn`, Zod, Resend REST API (`https://api.resend.com/emails`) via native `fetch`, existing `assertRateLimit` helper, React (plain controlled form, no new form library).

**Spec:** `docs/superpowers/specs/2026-09-10-despre-proiect-contact-design.md`

## Global Constraints

- No new npm dependencies (raw `fetch` to Resend, not the `resend` SDK — spec decision).
- No `react-hook-form` — follow the existing plain-`useState` controlled-form pattern from `src/routes/auth.tsx`.
- No database persistence of contact submissions — email only.
- `sendContactMessage` has no auth middleware — it's a public endpoint.
- Rate limit: 5 submissions per IP per 600 seconds (tune later if needed; this is a DoS/cost guard, not a UX feature).
- Honeypot field name: `website`. If non-empty, return `{ ok: true }` without sending any email or calling Resend — never reveal to the caller that it was flagged.
- Client-side error handling always shows a fixed, localized generic error string — never surface `err.message` from the server (could leak Resend/internal detail).
- Association website link: `https://atomploiesti.ro`, opened in a new tab (`target="_blank" rel="noopener noreferrer"`).
- Association contact email shown on the page: `contact@atomploiesti.ro` (as a `mailto:` link).
- `bun run build` currently fails in this worktree location with an unrelated pre-existing bug in `@lovable.dev/mcp-js` (`routesDir must resolve under <dir>` — a Windows path-separator issue, reproduces on unmodified `staging` too, not caused by this work). Use `./node_modules/.bin/tsc --noEmit` for type-checking in every task instead of `bun run build`.
- `bun run lint` currently reports ~10k pre-existing CRLF/prettier errors repo-wide (Windows checkout line-ending noise, unrelated to this work). Lint only the files you touch: `npx eslint <file>`.

---

### Task 1: Add `despreProiect.*` i18n keys (RO/EN/FR)

**Files:**
- Modify: `src/lib/i18n.tsx`

**Interfaces:**
- Produces: the following keys, present in all three dictionaries (`RO` ending at line 252, `EN` ending at line 475, `FR` ending at line 698) — `despreProiect.org.title`, `despreProiect.org.body`, `despreProiect.org.websiteLink`, `despreProiect.contact.title`, `despreProiect.contact.intro`, `despreProiect.contact.name`, `despreProiect.contact.email`, `despreProiect.contact.message`, `despreProiect.contact.submit`, `despreProiect.contact.sending`, `despreProiect.contact.success`, `despreProiect.contact.error`. Consumed by Task 3 via `t("despreProiect.…")`. The existing `nav.despreProiect` key (already present in all three dicts) is reused as the page `<h1>`.

- [ ] **Step 1: Add the RO keys**

In `src/lib/i18n.tsx`, in the `RO` dict, immediately before the `// Coming soon` comment (currently line 250), insert:

```ts
  // Despre proiect
  "despreProiect.org.title": "Asociația Societatea Culturală ATOM Ploiești",
  "despreProiect.org.body":
    "Asociația Societatea Culturală ATOM Ploiești este inițiatoarea proiectului Ploieștiul Istoric Digital, dedicat promovării patrimoniului istoric și cultural al orașului Ploiești.",
  "despreProiect.org.websiteLink": "Vizitează site-ul asociației",
  "despreProiect.contact.title": "Contactează-ne",
  "despreProiect.contact.intro": "Ai o întrebare, o sugestie sau informații despre o clădire istorică? Scrie-ne.",
  "despreProiect.contact.name": "Nume",
  "despreProiect.contact.email": "Email",
  "despreProiect.contact.message": "Mesaj",
  "despreProiect.contact.submit": "Trimite mesajul",
  "despreProiect.contact.sending": "Se trimite…",
  "despreProiect.contact.success": "Mesajul a fost trimis. Îți mulțumim!",
  "despreProiect.contact.error": "Mesajul nu a putut fi trimis. Încearcă din nou mai târziu.",

```

- [ ] **Step 2: Add the EN keys**

In the same file, in the `EN` dict, immediately before its `// Coming soon` comment (currently line 473), insert:

```ts
  // Despre proiect
  "despreProiect.org.title": "Asociația Societatea Culturală ATOM Ploiești",
  "despreProiect.org.body":
    "Asociația Societatea Culturală ATOM Ploiești is the initiator of the Digital Historic Ploiești project, dedicated to promoting the historic and cultural heritage of the city of Ploiești.",
  "despreProiect.org.websiteLink": "Visit the association's website",
  "despreProiect.contact.title": "Contact us",
  "despreProiect.contact.intro": "Have a question, a suggestion, or information about a historic building? Write to us.",
  "despreProiect.contact.name": "Name",
  "despreProiect.contact.email": "Email",
  "despreProiect.contact.message": "Message",
  "despreProiect.contact.submit": "Send message",
  "despreProiect.contact.sending": "Sending…",
  "despreProiect.contact.success": "Your message has been sent. Thank you!",
  "despreProiect.contact.error": "The message couldn't be sent. Please try again later.",

```

- [ ] **Step 3: Add the FR keys**

In the same file, in the `FR` dict, immediately before its `// Coming soon` comment (currently line 696), insert:

```ts
  // Despre proiect
  "despreProiect.org.title": "Asociația Societatea Culturală ATOM Ploiești",
  "despreProiect.org.body":
    "Asociația Societatea Culturală ATOM Ploiești est l'initiatrice du projet Ploieștiul Istoric Digital, dédié à la promotion du patrimoine historique et culturel de la ville de Ploiești.",
  "despreProiect.org.websiteLink": "Visitez le site de l'association",
  "despreProiect.contact.title": "Contactez-nous",
  "despreProiect.contact.intro": "Une question, une suggestion, ou des informations sur un bâtiment historique ? Écrivez-nous.",
  "despreProiect.contact.name": "Nom",
  "despreProiect.contact.email": "Email",
  "despreProiect.contact.message": "Message",
  "despreProiect.contact.submit": "Envoyer le message",
  "despreProiect.contact.sending": "Envoi en cours…",
  "despreProiect.contact.success": "Votre message a été envoyé. Merci !",
  "despreProiect.contact.error": "Le message n'a pas pu être envoyé. Veuillez réessayer plus tard.",

```

- [ ] **Step 4: Type-check**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors (this file has no compile-time key-parity check across languages — a missing key falls back to RO at runtime with a dev console warning — so also re-read the three inserted blocks side by side and confirm all 12 keys appear in each).

- [ ] **Step 5: Commit**

```bash
git add src/lib/i18n.tsx
git commit -m "Add despreProiect i18n keys (RO/EN/FR)"
```

---

### Task 2: `sendContactMessage` server function + env var docs

**Files:**
- Create: `src/lib/contact.functions.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `assertRateLimit(key: string, action: string, max: number, windowSeconds: number): Promise<void>` from `src/lib/rate-limit.ts` (throws `Error("Rate limit exceeded. Please try again shortly.")` when exceeded).
- Produces: `sendContactMessage` — a `createServerFn({ method: "POST" })` whose `.handler` accepts `{ name: string; email: string; message: string; honeypot?: string }` and resolves to `{ ok: true }` on success, or throws an `Error` on failure. Consumed by Task 3 via `useServerFn(sendContactMessage)`.

- [ ] **Step 1: Create the server function**

Create `src/lib/contact.functions.ts`:

```ts
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertRateLimit } from "@/lib/rate-limit";

const Input = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(5000),
  honeypot: z.string().max(500).optional().default(""),
});

function getClientIp(request: Request | null): string {
  const forwarded = request?.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    // Bots fill hidden fields; humans never see this one. Report success
    // without sending anything so the bot doesn't learn it was caught.
    if (data.honeypot) {
      return { ok: true as const };
    }

    const ip = getClientIp(getRequest() ?? null);
    await assertRateLimit(ip, "sendContactMessage", 5, 600);

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_FROM_EMAIL;
    if (!apiKey) throw new Error("Missing RESEND_API_KEY");
    if (!from) throw new Error("Missing CONTACT_FROM_EMAIL");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        to: "contact@atomploiesti.ro",
        from,
        reply_to: data.email,
        subject: "Mesaj nou de pe ploiestiulistoricdigital.ro",
        text: `Nume: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Contact email failed (${res.status}): ${body.slice(0, 200)}`);
    }

    return { ok: true as const };
  });
```

- [ ] **Step 2: Document the new env vars**

In `.env.example`, after the `--- Anthropic API (translation) ---` block (currently ending at line 39), insert:

```
# --- Resend (contact form) ---
# SECRET. Powers sendContactMessage (src/lib/contact.functions.ts), the
# public /despre-proiect contact form. RESEND_API_KEY is a Resend API key;
# CONTACT_FROM_EMAIL must be an address on a domain verified in that Resend
# account (e.g. "Ploieștiul Istoric Digital <contact-form@atomploiesti.ro>").
# Submitted messages are emailed to contact@atomploiesti.ro (hardcoded, not
# configurable via env) with reply-to set to the submitter's address.
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
CONTACT_FROM_EMAIL="Ploieștiul Istoric Digital <contact-form@atomploiesti.ro>"

```

- [ ] **Step 3: Type-check**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint the new file**

Run: `npx eslint src/lib/contact.functions.ts`
Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add src/lib/contact.functions.ts .env.example
git commit -m "Add sendContactMessage server function (Resend, rate-limited)"
```

---

### Task 3: Rewrite `/despre-proiect` page (about section + contact form)

**Files:**
- Modify: `src/routes/despre-proiect.tsx`

**Interfaces:**
- Consumes: `sendContactMessage` from `src/lib/contact.functions.ts` (Task 2); `despreProiect.*` and `nav.despreProiect` i18n keys (Task 1); `SiteNav` (no props) from `src/components/SiteNav.tsx`; `SiteFooter` (no props) from `src/components/SiteFooter.tsx`; `useI18n()` from `src/lib/i18n.tsx`.
- Produces: nothing consumed elsewhere — this is the leaf page.

- [ ] **Step 1: Replace the route file**

Replace the entire contents of `src/routes/despre-proiect.tsx` with:

```tsx
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
            {status === "sending" ? t("despreProiect.contact.sending") : t("despreProiect.contact.submit")}
          </button>
        </form>
      )}
    </div>
  );
}
```

Note: this drops the `{ name: "robots", content: "noindex" }` meta tag that the `ComingSoonPage` stub had — intentional, since this is now real indexable content (matches `patrimoniu.tsx`, which has no `robots` meta). The `ComingSoonPage` component itself (`src/components/ComingSoonPage.tsx`) is untouched — it's still used by the other not-yet-built nav pages.

- [ ] **Step 2: Type-check**

Run: `./node_modules/.bin/tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint the file**

Run: `npx eslint src/routes/despre-proiect.tsx`
Expected: no output (clean).

- [ ] **Step 4: Manual verification against a local Resend key**

1. Add `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` to a local `.env` (real Resend test-mode key, and a `from` address on a domain verified in that Resend account — or Resend's own sandbox domain if using a trial key).
2. `bun run dev`, open `/despre-proiect`.
3. Confirm the about section renders with the ATOM Ploiești website link (opens `https://atomploiesti.ro` in a new tab) and the `contact@atomploiesti.ro` mailto link.
4. Submit the contact form with valid values; confirm the success message appears and the email arrives (at `contact@atomploiesti.ro` or your test inbox) with `reply-to` set to the address you typed.
5. Open devtools, set the hidden `website` input's value, submit again; confirm the UI still shows success but no new email arrives.
6. Submit 6 times in under 10 minutes; confirm the 6th shows the generic error message, not a raw error.
7. Toggle the language switcher through RO/EN/FR and confirm all page and form text (including the success/sending/error states) is translated.

- [ ] **Step 5: Commit**

```bash
git add src/routes/despre-proiect.tsx
git commit -m "Build /despre-proiect: about section + contact form"
```

---

## Post-plan manual setup (not part of this implementation)

These are one-time dashboard steps for whoever holds the relevant accounts — flagged in the spec, not something code can do:

- Verify a sending domain (or subdomain) in the Resend account so `CONTACT_FROM_EMAIL` is a valid `from` address.
- Set `RESEND_API_KEY` and `CONTACT_FROM_EMAIL` as deploy environment variables in **both** Netlify sites (staging and production), per `DEPLOY_PLAN.md` §2.3 step 3.
