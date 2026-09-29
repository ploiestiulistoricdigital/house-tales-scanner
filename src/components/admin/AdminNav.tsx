import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LanguageSwitcher, useI18n } from "@/lib/i18n";

const linkCls =
  "text-sm sm:text-base text-muted-foreground hover:text-foreground px-3 py-2 min-h-11 inline-flex items-center";
const activeCls = { className: `${linkCls} !text-foreground font-medium` };

export function AdminNav() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { next: undefined }, replace: true });
  }

  return (
    <header className="border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link to="/admin" className="text-lg sm:text-xl font-semibold">
          {t("admin.title")}
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          <LanguageSwitcher />
          <Link to="/admin/heritage" className={linkCls} activeProps={activeCls}>
            {t("heritageItems.admin.title")}
          </Link>
          <Link to="/admin/istoria-ploiestiului" className={linkCls} activeProps={activeCls}>
            {t("heritageItems.admin.istoriaTitle")}
          </Link>
          <Link to="/admin/antiteza" className={linkCls} activeProps={activeCls}>
            {t("antiteza.admin.title")}
          </Link>
          <Link to="/admin/despre-proiect" className={linkCls} activeProps={activeCls}>
            {t("about.admin.title")}
          </Link>
          <Link to="/patrimoniu" className={linkCls}>
            {t("nav.viewSite")}
          </Link>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-1 min-h-11 rounded-md border px-3 py-2 text-sm sm:text-base hover:bg-accent"
          >
            <LogOut className="h-4 w-4" /> {t("nav.signOut")}
          </button>
        </nav>
      </div>
    </header>
  );
}
