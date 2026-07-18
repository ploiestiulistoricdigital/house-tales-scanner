import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "update_building",
  title: "Actualizează clădire",
  description: "Modifică una sau mai multe proprietăți ale unei clădiri existente. Necesită rol admin.",
  inputSchema: {
    id: z.string().uuid().describe("ID-ul clădirii de modificat."),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/).optional(),
    name: z.string().min(1).optional(),
    address: z.string().optional(),
    short_description: z.string().optional(),
    history: z.string().optional(),
    year_built: z.string().optional(),
    architect: z.string().optional(),
    cover_image_url: z.string().url().optional(),
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
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: ctx.getUserId(),
      _role: "admin",
    });
    if (!isAdmin) return { content: [{ type: "text", text: "Necesită rol de administrator." }], isError: true };

    const { data, error } = await supabase.from("buildings").update(updates).eq("id", id).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Clădirea "${data.name}" actualizată.` }],
      structuredContent: { building: data },
    };
  },
});
