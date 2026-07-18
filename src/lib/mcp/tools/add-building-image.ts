import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "add_building_image",
  title: "Adaugă imagine în galerie",
  description: "Adaugă o imagine (URL) în galeria unei clădiri. Necesită rol admin.",
  inputSchema: {
    building_id: z.string().uuid(),
    url: z.string().url(),
    caption: z.string().optional(),
    position: z.number().int().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false },
  handler: async (input, ctx) => {
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

    const { data, error } = await supabase.from("building_images").insert(input).select().single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Imagine adăugată (id: ${data.id}).` }],
      structuredContent: { image: data },
    };
  },
});
