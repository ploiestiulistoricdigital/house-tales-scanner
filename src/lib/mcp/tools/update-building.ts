import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { safeImageUrl } from "./validation";

export default defineTool({
  name: "update_building",
  title: "Actualizează clădire",
  description: "Modifică una sau mai multe proprietăți ale unei clădiri existente. Necesită rol admin.",
  inputSchema: {
    id: z.string().uuid().describe("ID-ul clădirii de modificat."),
    slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/).optional(),
    name: z.string().min(1).max(200).optional(),
    address: z.string().max(300).optional(),
    short_description: z.string().max(500).optional(),
    history: z.string().max(50000).optional(),
    year_built: z.string().max(50).optional(),
    architect: z.string().max(200).optional(),
    cover_image_url: safeImageUrl.optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  handler: async ({ id, ...updates }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Neautentificat." }], isError: true };
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.getUserId())
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) return { content: [{ type: "text", text: "Necesită rol de administrator." }], isError: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("buildings").update(updates).eq("id", id).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Clădirea "${data.name}" actualizată.` }],
      structuredContent: { building: data },
    };
  },
});
