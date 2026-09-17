import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/integrations/supabase/types";

const antitezaPairInput = z.object({
  before_image_url: z.string().url().max(2000),
  after_image_url: z.string().url().max(2000),
  before_caption: z.string().max(300).optional().nullable(),
  before_caption_en: z.string().max(300).optional().nullable(),
  before_caption_fr: z.string().max(300).optional().nullable(),
  after_caption: z.string().max(300).optional().nullable(),
  after_caption_en: z.string().max(300).optional().nullable(),
  after_caption_fr: z.string().max(300).optional().nullable(),
  sort_order: z.number().int().min(0).max(9999).default(0),
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

export const createAntitezaPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof antitezaPairInput>) => antitezaPairInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "antiteza:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("antiteza_pairs")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateAntitezaPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof antitezaPairInput> & { id: string }) =>
    z.object({ id: z.string().uuid() }).merge(antitezaPairInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "antiteza:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const { data: row, error } = await supabaseAdmin
      .from("antiteza_pairs")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAntitezaPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "antiteza:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("antiteza_pairs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
