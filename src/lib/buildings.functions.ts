import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUBLIC_SITE_URL } from "@/lib/site-url";

const buildingInput = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "lowercase letters, numbers, hyphens only"),
  name: z.string().min(1).max(200),
  name_en: z.string().max(200).optional().nullable(),
  name_fr: z.string().max(200).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  address_en: z.string().max(300).optional().nullable(),
  address_fr: z.string().max(300).optional().nullable(),
  year_built: z.string().max(50).optional().nullable(),
  architect: z.string().max(200).optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  short_description_en: z.string().max(500).optional().nullable(),
  short_description_fr: z.string().max(500).optional().nullable(),
  history: z.string().max(50000).optional().nullable(),
  history_en: z.string().max(50000).optional().nullable(),
  history_fr: z.string().max(50000).optional().nullable(),
  cover_image_url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
});

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


function qrUrlFor(slug: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=20&format=png&data=${encodeURIComponent(
    `${PUBLIC_SITE_URL}/b/${slug}`,
  )}`;
}

export const createBuilding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof buildingInput>) => buildingInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = {
      ...data,
      cover_image_url: data.cover_image_url || null,
      qr_code_url: qrUrlFor(data.slug),
    };
    const { data: row, error } = await context.supabase
      .from("buildings")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateBuilding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof buildingInput> & { id: string }) =>
    z.object({ id: z.string().uuid() }).merge(buildingInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      cover_image_url: rest.cover_image_url || null,
      qr_code_url: qrUrlFor(rest.slug),
    };
    const { data: row, error } = await context.supabase
      .from("buildings")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBuilding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("buildings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const imageInput = z.object({
  building_id: z.string().uuid(),
  image_url: z.string().url().max(2000),
  caption: z.string().max(300).optional().nullable(),
  caption_en: z.string().max(300).optional().nullable(),
  caption_fr: z.string().max(300).optional().nullable(),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const addBuildingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof imageInput>) => imageInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase
      .from("building_images")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const imageUpdateInput = z.object({
  id: z.string().uuid(),
  caption: z.string().max(300).optional().nullable(),
  caption_en: z.string().max(300).optional().nullable(),
  caption_fr: z.string().max(300).optional().nullable(),
});

export const updateBuildingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof imageUpdateInput>) => imageUpdateInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("building_images")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteBuildingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("building_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: Boolean(data) };
  });

// Bootstrap: the very first authenticated user to call this becomes admin.
// After the first admin exists, this function refuses further self-grants.
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: countErr } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countErr) throw new Error(countErr.message);
    if ((count ?? 0) > 0) return { granted: false as const };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { granted: true as const };
  });
