import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Autentificare administrator — Poveștile Caselor" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

function safeNext(next: string | undefined): string {
  if (!next) return "/admin";
  if (!next.startsWith("/") || next.startsWith("//")) return "/admin";
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = safeNext(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = target;
    });
  }, [target]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + target },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.href = target;
    } catch (err: any) {
      setError(err.message ?? "Ceva nu a mers bine");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Administrare</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-2">
          {mode === "signin" ? "Autentificare" : "Creează un cont"}
        </h1>
        <p className="text-base text-muted-foreground mb-6 leading-relaxed">
          Accesul de administrator se acordă separat. Contactează proprietarul site-ului dacă ai nevoie.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full rounded-md border px-3 py-3 text-base bg-background"
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-md border px-3 py-3 text-base bg-background"
            type="password"
            required
            minLength={6}
            placeholder="Parolă"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-base text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-11 rounded-md bg-primary text-primary-foreground py-3 text-base font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "…" : mode === "signin" ? "Autentificare" : "Înregistrare"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 w-full min-h-11 text-sm text-muted-foreground hover:text-foreground"
        >
          {mode === "signin" ? "Nu ai cont? Înregistrează-te" : "Ai deja cont? Autentifică-te"}
        </button>
      </div>
    </div>
  );
}
