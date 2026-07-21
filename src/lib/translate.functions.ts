import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(1).max(20000),
  target: z.enum(["en", "ro"]).default("en"),
});

export const translateText = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const targetName = data.target === "en" ? "English" : "Romanian";
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "openai/gpt-5.5",
        messages: [
          {
            role: "system",
            content: `You are a professional translator specialized in Romanian historical and architectural content. Translate the user's text into ${targetName}. Preserve tone, proper nouns, dates, and formatting (paragraph breaks). Return ONLY the translated text, no preamble, no quotes.`,
          },
          { role: "user", content: data.text },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Rate limit exceeded. Please retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace billing.");
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`Translation failed (${res.status}): ${t.slice(0, 200)}`);
    }

    const json: any = await res.json();
    const out = json?.choices?.[0]?.message?.content?.trim();
    if (!out) throw new Error("Empty translation response");
    return { text: out as string };
  });
