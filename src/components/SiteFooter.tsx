import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border/70 bg-secondary/50 py-8">
      <div className="mx-auto max-w-6xl px-4 flex flex-col items-center gap-3 text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
        <span>{t("home.footer")}</span>
        <Link to="/cookie-policy" className="text-xs tracking-widest normal-case underline underline-offset-4 hover:text-foreground transition-colors">
          {t("cookiePolicy.title")}
        </Link>
      </div>
    </footer>
  );
}
