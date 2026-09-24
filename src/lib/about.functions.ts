import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rate-limit";
import type { Database } from "@/integrations/supabase/types";

const aboutContentInput = z.object({
  title: z.string().trim().max(200).default(""),
  title_en: z.string().trim().max(200).optional().nullable(),
  title_fr: z.string().trim().max(200).optional().nullable(),
  description: z.string().max(50000).default(""),
  description_en: z.string().max(50000).optional().nullable(),
  description_fr: z.string().max(50000).optional().nullable(),
});

const teamMemberInput = z.object({
  name: z.string().trim().min(1).max(2000),
  role: z.string().max(3000).optional().nullable(),
  role_en: z.string().max(3000).optional().nullable(),
  role_fr: z.string().max(3000).optional().nullable(),
  photo_url: z.string().url().max(2000).optional().nullable().or(z.literal("")),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

function sanitizeAboutContent<T extends { description: string; description_en?: string | null; description_fr?: string | null }>(
  data: T,
  sanitize: (html: string) => string,
): T {
  return {
    ...data,
    description: sanitize(data.description),
    description_en: data.description_en != null ? sanitize(data.description_en) : data.description_en,
    description_fr: data.description_fr != null ? sanitize(data.description_fr) : data.description_fr,
  };
}

function sanitizeTeamMember<T extends { name: string; role?: string | null; role_en?: string | null; role_fr?: string | null }>(
  data: T,
  sanitize: (html: string) => string,
): T {
  return {
    ...data,
    name: sanitize(data.name),
    role: data.role != null ? sanitize(data.role) : data.role,
    role_en: data.role_en != null ? sanitize(data.role_en) : data.role_en,
    role_fr: data.role_fr != null ? sanitize(data.role_fr) : data.role_fr,
  };
}

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

export const updateAboutContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof aboutContentInput>) => aboutContentInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sanitizeRichText } = await import("@/lib/rich-text");
    const payload = sanitizeAboutContent(data, sanitizeRichText);
    const { data: row, error } = await supabaseAdmin
      .from("about_content")
      .update(payload)
      .eq("id", 1)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof teamMemberInput>) => teamMemberInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sanitizeRichText } = await import("@/lib/rich-text");
    const payload = { ...sanitizeTeamMember(data, sanitizeRichText), photo_url: data.photo_url || null };
    const { data: row, error } = await supabaseAdmin
      .from("team_members")
      .insert(payload)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof teamMemberInput> & { id: string }) =>
    z.object({ id: z.string().uuid() }).merge(teamMemberInput).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sanitizeRichText } = await import("@/lib/rich-text");
    const { id, ...rest } = data;
    const payload = { ...sanitizeTeamMember(rest, sanitizeRichText), photo_url: rest.photo_url || null };
    const { data: row, error } = await supabaseAdmin
      .from("team_members")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderTeamMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "about:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const results = await Promise.all(
      data.ids.map((id, index) =>
        supabaseAdmin.from("team_members").update({ sort_order: index }).eq("id", id),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw new Error(failed.error.message);
    return { ok: true };
  });
