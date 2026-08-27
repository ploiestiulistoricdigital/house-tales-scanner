import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "create_building",
  title: "Creează clădire",
  description: "Adaugă o clădire nouă în catalog. Necesită drept de administrator.",
  inputSchema: {
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Doar litere mici, cifre și liniuțe."),
    name: z.string().min(1),
    address: z.string().optional(),
    short_description: z.string().optional(),
    history: z.string().optional(),
    year_built: z.string().optional(),
    architect: z.string().optional(),
    cover_image_url: z.string().url().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Neautentificat." }], isError: true };
    }
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: isAdmin, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", ctx.getUserId())
      .eq("role", "admin")
      .maybeSingle();
    if (roleError) return { content: [{ type: "text", text: roleError.message }], isError: true };
    if (!isAdmin) return { content: [{ type: "text", text: "Necesită rol de administrator." }], isError: true };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("buildings").insert(input).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Clădirea "${data.name}" a fost creată (id: ${data.id}).` }],
      structuredContent: { building: data },
    };
  },
});
