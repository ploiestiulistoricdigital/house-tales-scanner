import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listBuildings from "./tools/list-buildings";
import getBuilding from "./tools/get-building";
import createBuilding from "./tools/create-building";
import updateBuilding from "./tools/update-building";
import deleteBuilding from "./tools/delete-building";
import addBuildingImage from "./tools/add-building-image";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "poveștile-caselor-mcp",
  title: "Poveștile Caselor",
  version: "0.1.0",
  instructions:
    "Tool-uri pentru catalogul de clădiri istorice. Folosește `list_buildings` și `get_building` pentru a explora catalogul; tool-urile de creare/actualizare/ștergere necesită rol de administrator.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listBuildings, getBuilding, createBuilding, updateBuilding, deleteBuilding, addBuildingImage],
});
