import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Minimal typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthResult = {
  data: { redirect_url?: string; redirect_to?: string; client?: { name?: string } } | null;
  error: { message: string } | null;
};
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
    approveAuthorization: (id: string) => Promise<OAuthResult>;
    denyAuthorization: (id: string) => Promise<OAuthResult>;
  };
}).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold mb-2">Autorizare eșuată</h1>
        <p className="text-muted-foreground">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "Această aplicație";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("Serverul de autorizare nu a returnat un URL de redirect.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 sm:p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Conectează {clientName} la contul tău</h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          {clientName} va putea apela tool-urile MCP ale Poveștile Caselor în numele tău, cât timp ești autentificat.
          Permisiunile aplicației și politicile bazei de date rămân în vigoare.
        </p>
        {error && <p role="alert" className="text-destructive text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 min-h-11 rounded-md bg-primary text-primary-foreground py-3 text-base font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            Aprobă
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 min-h-11 rounded-md border py-3 text-base font-medium hover:bg-muted disabled:opacity-50"
          >
            Refuză
          </button>
        </div>
      </div>
    </main>
  );
}
