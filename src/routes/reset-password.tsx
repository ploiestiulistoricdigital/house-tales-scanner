import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2 } from "lucide-react";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Setează o parolă nouă — Poveștile Caselor" },
      {
        name: "description",
        content:
          "Setează o parolă nouă pentru contul de administrare al arhivei Poveștile Caselor.",
      },
      { property: "og:title", content: "Setează o parolă nouă — Poveștile Caselor" },
      {
        property: "og:description",
        content: "Finalizează resetarea parolei pentru contul de administrare.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    // Supabase parses the recovery link (hash or ?code=) and emits a session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        setHasSession(true);
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setHasSession(!!data.session);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t("auth.newPassword.mismatch"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => navigate({ to: "/admin" }), 1200);
    } catch (err: any) {
      setError(err?.message ?? t("auth.error.generic"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="fixed top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">{t("auth.admin")}</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-2">
          {t("auth.newPassword.title")}
        </h1>
        <p className="text-base text-muted-foreground mb-6 leading-relaxed">
          {t("auth.newPassword.desc")}
        </p>

        {done ? (
          <p className="text-base text-primary">{t("auth.newPassword.done")}</p>
        ) : ready && !hasSession ? (
          <div className="space-y-4">
            <p className="text-base text-destructive">
              {t("auth.newPassword.invalidLink")}
            </p>
            <Link
              to="/auth"
              search={{ next: undefined }}
              className="inline-flex min-h-11 items-center justify-center rounded-md border px-4 py-2 text-base hover:bg-accent"
            >
              {t("auth.reset.back")}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <input
              className="w-full rounded-md border px-3 py-3 text-base bg-background"
              type="password"
              required
              minLength={6}
              placeholder={t("auth.newPassword.field")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="w-full rounded-md border px-3 py-3 text-base bg-background"
              type="password"
              required
              minLength={6}
              placeholder={t("auth.newPassword.confirm")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {error && <p className="text-base text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={loading || !ready}
              className="w-full min-h-11 rounded-md bg-primary text-primary-foreground py-3 text-base font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "…" : t("auth.newPassword.save")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
