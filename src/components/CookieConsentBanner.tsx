import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { getConsent, setConsent } from "@/lib/cookie-consent";
import { loadGoogleAnalytics } from "@/lib/analytics";

export function CookieConsentBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === null);
  }, []);

  if (!visible) return null;

  const accept = () => {
    setConsent("accepted");
    if (import.meta.env.PROD) loadGoogleAnalytics();
    setVisible(false);
  };

  const decline = () => {
    setConsent("declined");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t("cookieBanner.title")}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 backdrop-blur px-4 py-4 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-foreground/85 text-center sm:text-left">
          {t("cookieBanner.text")}{" "}
          <Link to="/cookie-policy" className="underline underline-offset-4 hover:text-foreground">
            {t("cookiePolicy.title")}
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={decline}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("cookieBanner.decline")}
          </button>
          <button
            type="button"
            onClick={accept}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("cookieBanner.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
