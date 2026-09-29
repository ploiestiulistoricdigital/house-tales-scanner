import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/integrations/supabase/types";

const istoriaContentInput = z.object({
  title: z.string().trim().max(200).default(""),
  title_en: z.string().trim().max(200).optional().nullable(),
  title_fr: z.string().trim().max(200).optional().nullable(),
  description: z.string().max(200000).default(""),
  description_en: z.string().max(200000).optional().nullable(),
  description_fr: z.string().max(200000).optional().nullable(),
  images: z.array(z.string().url().max(2000)).max(50).default([]),
});

async function assertAdmin(ctx: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await ctx.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", ctx.userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const updateIstoriaContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof istoriaContentInput>) => istoriaContentInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "istoria:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sanitizeRichText } = await import("@/lib/rich-text");
    const { images, ...rest } = data;
    const payload = {
      ...rest,
      description: sanitizeRichText(rest.description),
      description_en: rest.description_en != null ? sanitizeRichText(rest.description_en) : rest.description_en,
      description_fr: rest.description_fr != null ? sanitizeRichText(rest.description_fr) : rest.description_fr,
    };
    const { data: row, error } = await supabaseAdmin
      .from("istoria_content")
      .update(payload)
      .eq("id", 1)
      .select()
      .single();
    if (error) throw new Error(error.message);

    const { error: delError } = await supabaseAdmin
      .from("istoria_content_images")
      .delete()
      .gte("sort_order", 0);
    if (delError) throw new Error(delError.message);
    if (images.length > 0) {
      const { error: insError } = await supabaseAdmin
        .from("istoria_content_images")
        .insert(images.map((image_url, sort_order) => ({ image_url, sort_order })));
      if (insError) throw new Error(insError.message);
    }
    return row;
  });
