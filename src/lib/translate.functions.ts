import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

const Input = z.object({
  text: z.string().min(1).max(20000),
  target: z.enum(["en", "ro", "fr"]).default("en"),
});

const TARGET_NAME: Record<"en" | "ro" | "fr", string> = {
  en: "English",
  ro: "Romanian",
  fr: "French",
};

export const translateText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

    const targetName = TARGET_NAME[data.target];
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 8192,
        stream: true,
        system: `You are a professional translator specialized in Romanian historical and architectural content. Translate the user's text into ${targetName}. Preserve tone, proper nouns, dates, and formatting (paragraph breaks). Return ONLY the translated text, no preamble, no quotes.`,
        messages: [{ role: "user", content: data.text }],
      }),
    });

    if (res.status === 429) throw new Error("Rate limit exceeded. Please retry shortly.");
    if (res.status === 401) throw new Error("Invalid Anthropic API key.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Translation failed (${res.status}): ${t.slice(0, 200)}`);
    }
    if (!res.body) throw new Error("Empty translation response");

    // Long completions (e.g. a full French History translation) can take long
    // enough to generate that a non-streaming request sits idle and gets killed
    // by an intermediary (proxy/AV TLS inspection) before Anthropic finishes.
    // Streaming keeps bytes flowing continuously so nothing times out the
    // connection; we just accumulate the deltas server-side and return the
    // finished text, so the client-facing contract is unchanged.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const payload = line.slice(6);
        let event: any;
        try {
          event = JSON.parse(payload);
        } catch {
          continue;
        }
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          out += event.delta.text;
        } else if (event.type === "error") {
          throw new Error(event.error?.message ?? "Translation stream error");
        }
      }
    }

    out = out.trim();
    if (!out) throw new Error("Empty translation response");
    return { text: out };
  });
