import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertRateLimit } from "@/lib/rate-limit";

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

const saveInput = z.object({
  building_id: z.string().uuid(),
  format: z.enum(["png", "pdf"]),
  base64: z.string().min(1).max(4_000_000), // ~3MB raw
});

export const saveQrExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof saveInput>) => saveInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "qrExports:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${data.building_id}/${ts}.${data.format}`;
    const contentType = data.format === "pdf" ? "application/pdf" : "image/png";

    const { error: upErr } = await supabaseAdmin.storage
      .from("qr-codes")
      .upload(path, bin, { contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data: pub } = supabaseAdmin.storage.from("qr-codes").getPublicUrl(path);

    const { data: row, error } = await supabaseAdmin
      .from("qr_code_exports")
      .insert({
        building_id: data.building_id,
        format: data.format,
        file_url: pub.publicUrl,
        file_path: path,
        file_size: bin.byteLength,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteQrExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await assertRateLimit(context.userId, "qrExports:mutate", 60, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: selErr } = await supabaseAdmin
      .from("qr_code_exports")
      .select("file_path")
      .eq("id", data.id)
      .single();
    if (selErr) throw new Error(selErr.message);
    if (row?.file_path) {
      await supabaseAdmin.storage.from("qr-codes").remove([row.file_path]);
    }
    const { error } = await supabaseAdmin.from("qr_code_exports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
