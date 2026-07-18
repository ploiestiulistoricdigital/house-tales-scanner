import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "delete_building",
  title: "Șterge clădire",
  description: "Șterge definitiv o clădire și galeria ei. Necesită rol admin.",
  inputSchema: {
    id: z.string().uuid().describe("ID-ul clădirii de șters."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true },
  handler: async ({ id }, ctx) => {
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

    const { error } = await supabase.from("buildings").delete().eq("id", id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Clădirea ${id} a fost ștearsă.` }] };
  },
});
