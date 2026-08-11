import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactInput = z.object({
  full_name: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(4).max(40),
  subject: z.string().trim().min(2).max(200),
  message: z.string().trim().min(2).max(5000),
});

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof contactInput>) => contactInput.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_messages").insert({
      full_name: data.full_name || null,
      email: data.email,
      phone: data.phone,
      subject: data.subject,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true } as const;
  });
