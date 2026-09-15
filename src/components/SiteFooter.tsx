import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { PUBLIC_SITE_URL } from "@/lib/site-url";

export function SiteFooter() {
  const { t } = useI18n();
  const domainText = `www.${PUBLIC_SITE_URL.replace(/^https?:\/\//, "")}`;
  return (
    <footer className="border-t border-border/70 bg-secondary/50 py-8">
      <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-3 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
        <span>
          {t("home.footer")} · {domainText}
        </span>
        <Link to="/cookie-policy" className="text-xs tracking-widest normal-case underline underline-offset-4 hover:text-foreground transition-colors">
          {t("cookiePolicy.title")}
        </Link>
      </div>
    </footer>
  );
}
