import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { assertRateLimit } from "@/lib/rate-limit";

// Base64 inflates size by ~4/3; cap the encoded string so the decoded file
// never exceeds 4 MB even before we re-check the decoded byte length below.
const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_ATTACHMENT_BASE64_LEN = Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3) + 100;

const Input = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(5000),
  honeypot: z.string().max(500).optional().default(""),
  attachment: z
    .object({
      filename: z.string().trim().min(1).max(200),
      contentType: z.string().trim().max(200).optional(),
      base64: z.string().max(MAX_ATTACHMENT_BASE64_LEN),
    })
    .optional(),
});

function getClientIp(request: Request | null): string {
  // Netlify's edge sets this from the real peer connection; unlike
  // x-forwarded-for it cannot be spoofed by the caller.
  const nf = request?.headers.get("x-nf-client-connection-ip");
  if (nf) return nf.trim();
  const forwarded = request?.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",").pop()!.trim(); // last hop, not first
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

    try {
      const ip = getClientIp(getRequest() ?? null);
      await assertRateLimit(ip, "sendContactMessage", 5, 600);

      if (data.attachment) {
        const base64Body = data.attachment.base64.replace(/^data:[^,]*,/, "");
        const padding = base64Body.endsWith("==") ? 2 : base64Body.endsWith("=") ? 1 : 0;
        const decodedBytes = Math.floor((base64Body.length * 3) / 4) - padding;
        if (decodedBytes > MAX_ATTACHMENT_BYTES) {
          throw new Error("Attachment exceeds 4 MB limit");
        }
      }

      const gmailUser = process.env.CONTACT_FROM_EMAIL;
      const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
      if (!gmailUser) throw new Error("Missing CONTACT_FROM_EMAIL");
      if (!gmailAppPassword) throw new Error("Missing GMAIL_APP_PASSWORD");

      // Gmail SMTP: no domain verification needed (unlike Resend), but the
      // From address must be the same account that authenticates, so sender
      // and recipient are both the site's Gmail inbox.
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailAppPassword },
      });

      await transporter.sendMail({
        to: "ploiestiulistoricdigital@gmail.com",
        from: gmailUser,
        replyTo: data.email,
        subject: "Mesaj nou de pe ploiestiulistoricdigital.ro",
        text: `Nume: ${data.name}\nEmail: ${data.email}\n\n${data.message}`,
        ...(data.attachment
          ? {
              attachments: [
                {
                  filename: data.attachment.filename,
                  content: Buffer.from(data.attachment.base64.replace(/^data:[^,]*,/, ""), "base64"),
                },
              ],
            }
          : {}),
      });

      return { ok: true as const };
    } catch (err) {
      console.error("[contact] sendContactMessage failed", {
        message: err instanceof Error ? err.message : String(err),
        hasAttachment: Boolean(data.attachment),
        attachmentBase64Len: data.attachment?.base64.length ?? 0,
        attachmentFilename: data.attachment?.filename,
      });
      throw err;
    }
  });
