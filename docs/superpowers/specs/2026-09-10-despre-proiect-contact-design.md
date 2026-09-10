# `/despre-proiect` page: about the association + contact form

## Context

`/despre-proiect` currently renders the generic `ComingSoonPage` stub
(`src/routes/despre-proiect.tsx`). It needs to become a real page with two
things:

1. Information about **Asociația Societatea Culturală ATOM Ploiești** —
   a link to its website and its contact info.
2. A contact form whose submissions are emailed to `contact@atomploiesti.ro`.

There is currently no email-sending capability anywhere in this codebase
(`plan.md` §3 lists transactional-email setup as an open backlog item, and
that's scoped to Supabase Auth emails, not general contact mail). This design
introduces that capability, scoped narrowly to this one form.

## Page (`src/routes/despre-proiect.tsx`)

Replace the `ComingSoonPage` stub with a real component, following the
existing `patrimoniu.tsx` page-shell pattern: `<SiteNav />` at the top,
content in a centered `<section>`, `<SiteFooter />` at the bottom. Two
sections:

- **About the association** — a short intro paragraph (RO/EN/FR via i18n),
  a link to `https://atomploiesti.ro` (`target="_blank" rel="noopener noreferrer"`),
  and a `mailto:contact@atomploiesti.ro` link.
- **Contact form** — see below.

All copy goes through `src/lib/i18n.tsx` under a new `despreProiect.*` key
namespace (RO/EN/FR), matching the existing dictionary structure (flat
`key -> string`, one block per language, e.g. `nav.despreProiect` at line 33
for RO, 270 for EN, 493 for FR).

## Contact form

A plain controlled-input form (no `react-hook-form` — the codebase has it as
a dependency but doesn't use it anywhere; `auth.tsx` is the existing form
pattern to follow: local `useState` per field, a manual `onSubmit` handler).

**Fields:**
- `name` — text input, required
- `email` — email input, required
- `message` — textarea, required
- a hidden honeypot input (e.g. `website`), visually hidden (not just
  `display:none`, which some bots skip — use an off-screen-but-focusable-safe
  technique consistent with standard honeypot practice), never expected to
  be filled by a human

**Client-side behavior:** basic non-empty/valid-email checks before submit
(mirroring existing form UX elsewhere), a submitting/disabled state on the
button, and an inline success or error message after the call resolves — no
navigation away from the page.

## Server function (`src/lib/contact.functions.ts`)

```
sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator(zod schema)
  .handler(...)
```

- **No auth middleware** — this is a public, unauthenticated endpoint.
- **Input schema:** `name` (1–200 chars), `email` (valid email format),
  `message` (1–5000 chars), `honeypot` (string, optional/defaults to `""`).
- **Honeypot check:** if `honeypot` is non-empty, return a success-shaped
  response without sending an email or calling Resend — never reveal to the
  caller that it was flagged.
- **Rate limiting:** reuse `assertRateLimit` (`src/lib/rate-limit.ts`), which
  currently takes a `userId`; call it with the caller's IP instead, obtained
  via `getRequest()` (from `@tanstack/react-start/server`, already used in
  `src/integrations/supabase/auth-middleware.ts`) reading the
  `x-forwarded-for` header (Netlify sets this). Suggested budget: a generous
  but bounded limit, e.g. 5 submissions per IP per 10 minutes — tune during
  implementation, this is a DoS/cost guard, not a UX feature.
- **Sending the email:** raw `fetch` to `https://api.resend.com/emails`,
  `Authorization: Bearer ${RESEND_API_KEY}`. Request body:
  - `to`: `"contact@atomploiesti.ro"`
  - `from`: `process.env.CONTACT_FROM_EMAIL`
  - `reply_to`: the submitter's `email`
  - `subject`: a fixed string (e.g. `"Mesaj nou de pe ploiestiulistoricdigital.ro"`)
  - `text` (or `html`): the submitter's name + message
  Throw on a non-2xx response so the client shows an error state.
- **No database persistence** — email-only, nothing stored in Supabase.

## Environment variables

Add to `.env.example` (server-only, `SECRET` for the API key, following the
existing `ANTHROPIC_API_KEY` comment style):

- `RESEND_API_KEY` — secret, used only in `contact.functions.ts`.
- `CONTACT_FROM_EMAIL` — the verified `from` address/domain in Resend (e.g.
  `Ploieștiul Istoric Digital <contact-form@atomploiesti.ro>` — the exact
  value depends on what gets verified in the Resend account, which is a
  manual one-time setup step outside this codebase, same category as the
  Supabase storage-bucket setup in `DEPLOY_PLAN.md` §2.2 step 3).

Both need to be set as deploy environment variables in **both** the staging
and production Netlify sites, per `DEPLOY_PLAN.md`'s existing per-environment
env var convention (§2.3 step 3). This is a manual setup step for whoever
has Netlify/Resend dashboard access — not something this implementation can
do itself.

## Error handling

- Resend API failure (non-2xx, network error) → server function throws →
  client shows a generic "couldn't send, try again" inline error (localized).
- Rate limit exceeded → same generic error treatment (don't leak rate-limit
  internals to the caller).
- Honeypot triggered → silent success (no error, no email sent).
- Missing `RESEND_API_KEY`/`CONTACT_FROM_EMAIL` at runtime → throw clearly
  (fail loud in logs; this is a deploy-config problem, not a user error).

## Testing

- Manual: fill and submit the form locally against a real Resend API key in
  `.env`, confirm the email arrives at `contact@atomploiesti.ro` (or a test
  inbox) with the right reply-to.
- Manual: submit with the honeypot field populated (via devtools) and
  confirm no email is sent but the UI still shows success.
- Manual: exceed the rate limit and confirm the error state appears without
  a raw stack trace or internal detail leaking to the UI.
- `bun run lint` and a production `bun run build` must pass.
- No automated test coverage is being added for this (the repo has no
  established pattern for testing server functions that call external APIs);
  flag if that should change.

## Out of scope

- Storing submissions in the database (explicitly declined for this pass).
- CAPTCHA or any spam defense beyond the honeypot.
- An auto-reply confirmation email to the submitter.
- Setting up the Resend account/domain verification itself, or setting the
  Netlify env vars — both are manual dashboard steps for whoever holds those
  accounts, called out above but not part of the implementation plan.
