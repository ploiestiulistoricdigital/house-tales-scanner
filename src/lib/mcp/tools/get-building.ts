import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_building",
  title: "Detalii clădire",
  description: "Returnează detalii complete despre o clădire (după slug) inclusiv galeria de imagini.",
  inputSchema: {
    slug: z.string().min(1).describe("Slug-ul clădirii, ex: 'casa-batllo'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ slug }, ctx) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    const { data: building, error } = await supabase
      .from("buildings")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!building) return { content: [{ type: "text", text: `Nu există clădire cu slug '${slug}'.` }], isError: true };
    const { data: images } = await supabase
      .from("building_images")
      .select("id, url, caption, position")
      .eq("building_id", building.id)
      .order("position");
    const result = { ...building, images: images ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
