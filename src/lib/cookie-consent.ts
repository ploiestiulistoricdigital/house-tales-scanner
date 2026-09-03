const STORAGE_KEY = "hts.cookieConsent";

export type Consent = "accepted" | "declined";

export function getConsent(): Consent | null {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === "accepted" || saved === "declined" ? saved : null;
  } catch {
    return null;
  }
}

export function setConsent(consent: Consent) {
  try {
    window.localStorage.setItem(STORAGE_KEY, consent);
  } catch {}
}
