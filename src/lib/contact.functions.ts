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
