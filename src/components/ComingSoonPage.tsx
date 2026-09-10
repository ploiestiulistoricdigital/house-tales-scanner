import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useI18n } from "@/lib/i18n";

type ComingSoonTitleKey =
  | "nav.istoriaPloiestiului"
  | "nav.personalitati"
  | "nav.harti"
  | "nav.trasee"
  | "nav.arhiva"
  | "nav.despreProiect";

export function ComingSoonPage({ titleKey }: { titleKey: ComingSoonTitleKey }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <div className="flex-1 flex items-center justify-center px-4 py-24 text-center">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mb-4">{t(titleKey)}</h1>
          <p className="text-muted-foreground text-lg">{t("comingSoon.body")}</p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
