import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
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

    const json: any = await res.json();
    const out = (json?.content ?? [])
      .filter((block: any) => block?.type === "text")
      .map((block: any) => block.text)
      .join("")
      .trim();
    if (!out) throw new Error("Empty translation response");
    return { text: out as string };
  });
