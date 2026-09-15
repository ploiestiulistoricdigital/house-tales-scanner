import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/integrations/supabase/types";

const HERITAGE_CATEGORIES = ["locuri_disparute", "oameni_povesti", "documente_arhiva"] as const;

const heritageItemInput = z.object({
  category: z.enum(HERITAGE_CATEGORIES),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
  title: z.string().min(1).max(200),
  title_en: z.string().max(200).optional().nullable(),
  title_fr: z.string().max(200).optional().nullable(),
  description: z.string().max(50000).optional().nullable(),
  description_en: z.string().max(50000).optional().nullable(),
  description_fr: z.string().max(50000).optional().nullable(),
  image_url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
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

export const createHeritageItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof heritageItemInput>) => heritageItemInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "heritage:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = { ...data, image_url: data.image_url || null };
    const { data: row, error } = await supabaseAdmin
      .from("heritage_items")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateHeritageItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof heritageItemInput> & { id: string }) =>
    z.object({ id: z.string().uuid() }).merge(heritageItemInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "heritage:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const payload = { ...rest, image_url: rest.image_url || null };
    const { data: row, error } = await supabaseAdmin
      .from("heritage_items")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteHeritageItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "heritage:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("heritage_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
