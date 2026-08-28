import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from "react";

export type Lang = "ro" | "en" | "fr";
export const LANGS: Lang[] = ["ro", "en", "fr"];
export const DEFAULT_LANG: Lang = "ro";
const STORAGE_KEY = "hts.lang";

// useLayoutEffect warns when it runs during SSR (it can't affect the
// server-rendered output), but on the client it flushes synchronously before
// paint — exactly what we want so a returning EN/FR visitor's saved language
// applies before the browser ever shows the RO-default first frame.
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Dict = Record<string, string>;

const RO: Dict = {
  // Brand / header
  "brand.title": "Poveștile Caselor",
  "brand.tagline": "Arhivă urbană",
  "nav.admin": "Administrare",
  "nav.viewSite": "Vezi site-ul",
  "nav.signOut": "Deconectare",
  "nav.back": "Înapoi",
  "nav.backHome": "Înapoi acasă",
  "nav.backArchive": "Arhivă",

  // Home
  "home.badge": "Cronica clădirilor",
  "home.h1.a": "Descoperă povestea din spatele",
  "home.h1.b": "fiecărui zid",
  "home.lead": "Fiecare piatră a orașului poartă o memorie. Scanează un cod QR de pe fațadă sau răsfoiește arhiva pentru a intra în cronica urbană a clădirilor istorice.",
  "home.archive": "Arhiva clădirilor",
  "home.records.one": "înregistrare",
  "home.records.many": "înregistrări",
  "home.loading": "Se răsfoiesc filele arhivei…",
  "home.empty": "Arhiva este încă goală. Autentifică-te ca administrator pentru a adăuga prima cronică.",
  "home.error": "Arhiva nu a putut fi încărcată. Verifică conexiunea și încearcă din nou.",
  "home.pagination.perPage": "Pe pagină",
  "home.pagination.pageOf": "Pagina {page} din {total}",
  "home.pagination.prev": "Înapoi",
  "home.pagination.next": "Înainte",
  "home.pagination.first": "Prima",
  "home.pagination.last": "Ultima",
  "home.footer": "Poveștile Caselor · Memoria orașului",

  // Building page
  "building.chronicle": "Cronica clădirii",
  "building.gallery": "Galerie",
  "building.image.one": "imagine",
  "building.image.many": "imagini",
  "building.notFound.title": "Clădirea nu a fost găsită",
  "building.notFound.desc": "Acest cod QR ar putea fi învechit.",
  "building.error.title": "Pagina nu a putut fi încărcată",

  // Root fallbacks
  "root.404.title": "Pagina nu a fost găsită",
  "root.404.desc": "Pagina pe care o cauți nu există sau a fost mutată.",
  "root.404.back": "Înapoi la pagina principală",
  "root.error.title": "Această pagină nu s-a încărcat",
  "root.error.desc": "Ceva nu a mers bine. Poți încerca să reîncarci sau să te întorci la pagina principală.",
  "root.error.retry": "Încearcă din nou",

  // Auth
  "auth.admin": "Administrare",
  "auth.signin": "Autentificare",
  "auth.signup": "Creează un cont",
  "auth.register": "Înregistrare",
  "auth.email": "Email",
  "auth.password": "Parolă",
  "auth.help": "Accesul de administrator se acordă separat. Contactează proprietarul site-ului dacă ai nevoie.",
  "auth.toSignup": "Nu ai cont? Înregistrează-te",
  "auth.toSignin": "Ai deja cont? Autentifică-te",
  "auth.error.generic": "Ceva nu a mers bine",
  "auth.forgot": "Ai uitat parola?",
  "auth.reset.title": "Resetează parola",
  "auth.reset.desc": "Introdu adresa de email a contului de administrare și îți trimitem un link de resetare.",
  "auth.reset.send": "Trimite linkul de resetare",
  "auth.reset.sent": "Am trimis un email cu linkul de resetare. Verifică inboxul.",
  "auth.reset.back": "Înapoi la autentificare",
  "auth.newPassword.title": "Setează o parolă nouă",
  "auth.newPassword.desc": "Alege o parolă nouă pentru contul de administrare.",
  "auth.newPassword.field": "Parolă nouă",
  "auth.newPassword.confirm": "Confirmă parola",
  "auth.newPassword.save": "Salvează parola",
  "auth.newPassword.mismatch": "Parolele nu coincid",
  "auth.newPassword.done": "Parola a fost schimbată.",
  "auth.newPassword.invalidLink": "Link invalid sau expirat. Cere un link nou de resetare.",

  // Admin
  "admin.title": "Administrare clădiri",
  "admin.all": "Toate clădirile",
  "admin.new": "Clădire nouă",
  "admin.empty": "Nicio clădire încă. Creează prima.",
  "admin.error": "Lista clădirilor nu a putut fi încărcată. Verifică conexiunea și încearcă din nou.",
  "admin.loading": "Se încarcă…",
  "admin.copyUrl": "Copiază URL",
  "admin.copied": "Copiat!",
  "admin.viewPublic": "Vezi pagina publică",
  "admin.view": "Vezi",
  "admin.edit": "Editează",
  "admin.editBuilding": "Editează clădirea",
  "admin.delete": "Șterge",
  "admin.deleteBuilding": "Șterge clădirea",
  "admin.confirmDelete.title": "Ștergi clădirea?",
  "admin.confirmDelete": "Ștergi „{name}”? Această acțiune este ireversibilă.",
  "admin.hint": "Sfat: copiază URL-ul public al fiecărei clădiri și inserează-l în orice generator de coduri QR (de exemplu qrcode-monkey.com) pentru a produce un abțibild QR de pus pe perete.",
  "admin.unauthorized.title": "Neautorizat",
  "admin.unauthorized.desc": "Contul tău este autentificat, dar nu are drepturi de administrator. Contactează proprietarul site-ului pentru acces.",
  "common.cancel": "Anulează",
  "common.confirm": "Confirmă",
  "common.delete": "Șterge",

  // New / Edit
  "form.newBuilding": "Clădire nouă",
  "form.create": "Creează",
  "form.save": "Salvează modificările",
  "form.saving": "Se salvează…",
  "form.createFailed": "Crearea a eșuat",
  "form.saveFailed": "Salvarea a eșuat",

  // Building form fields
  "field.name": "Nume *",
  "field.slug": "Identificator URL * (folosit în adresa: /b/<slug>)",
  "field.slug.hint": "Doar litere mici, cifre și cratime. Ex: casa-batllo",
  "field.address": "Adresă",
  "field.year": "Anul construcției",
  "field.year.hint": "Acceptă orice format: an exact, interval sau aproximativ.",
  "field.year.placeholder": "ex: 1904, 1940-1942 sau c. 1900",
  "field.architect": "Arhitect",
  "err.year.max": "Anul poate avea cel mult 50 de caractere.",
  "err.name.required": "Numele este obligatoriu.",
  "err.name.min": "Numele trebuie să aibă cel puțin 2 caractere.",
  "err.name.max": "Numele poate avea cel mult 150 de caractere.",
  "err.slug.required": "Identificatorul URL este obligatoriu.",
  "err.slug.min": "Identificatorul trebuie să aibă cel puțin 2 caractere.",
  "err.slug.max": "Identificatorul poate avea cel mult 100 de caractere.",
  "err.slug.format": "Folosește doar litere mici, cifre și cratime.",
  "field.cover": "Imagine principală",
  "field.uploadCover": "Încarcă imagine",
  "field.short": "Descriere scurtă",
  "field.history": "Istoric",


  "err.short.max": "Descrierea scurtă este prea lungă (max. 500 caractere).",
  
  "form.checkOne": "Verifică câmpul marcat înainte de salvare.",
  "form.checkMany": "Verifică cele {n} câmpuri marcate înainte de salvare.",

  // Gallery on edit
  "gallery.title": "Galerie",
  "gallery.empty": "Nicio imagine în galerie încă.",
  "gallery.urlPlaceholder": "URL imagine (https://…) sau folosește butonul de încărcare",
  "gallery.uploadLabel": "Încarcă din galerie",
  "gallery.captionPlaceholder": "Descriere (opțional)",
  "gallery.captionPlaceholder.en": "Descriere EN (opțional)",
  "gallery.captionPlaceholder.fr": "Descriere FR (opțional)",
  "gallery.edit": "Editează descrierea",
  "gallery.saveCaptions": "Salvează",
  "gallery.cancel": "Anulează",
  "gallery.add": "Adaugă imagine",
  "gallery.deleteImage": "Șterge imaginea",
  "gallery.confirmDelete.title": "Ștergi imaginea?",
  "gallery.confirmDelete": "Această imagine va fi eliminată din galerie definitiv.",

  // Image uploader
  "upload.default": "Încarcă imagine",
  "upload.uploading": "Se încarcă…",
  "upload.formatHelp": "PNG, JPG, WEBP sau GIF · max. {mb} MB",
  "upload.err.type": "Format neacceptat{parens}. Sunt permise doar PNG, JPG, WEBP sau GIF.",
  "upload.err.empty": "Fișierul este gol.",
  "upload.err.size": "Imaginea este prea mare ({size}). Dimensiunea maximă este {mb} MB.",
  "upload.err.generic": "Încărcarea a eșuat. Încearcă din nou.",

  // QR
  "qr.title": "Cod QR",
  "qr.hint": "Se generează pe baza identificatorului URL. Scanează pentru a testa:",
  "qr.downloadPng": "Descarcă PNG",
  "qr.downloadPdf": "Descarcă PDF",
  "qr.downloading": "Se descarcă…",
  "qr.generating": "Se generează…",
  "qr.open": "Deschide",
  "qr.autoSave": "Fiecare descărcare este salvată automat în istoricul clădirii.",
  "qr.afterSave": "Istoricul descărcărilor este disponibil după ce salvezi clădirea.",
  "qr.saveFailed": "Descărcarea a reușit, dar nu a putut fi salvată în istoric.",
  "qr.needSlug": "Completează identificatorul URL pentru a genera codul QR.",
  "qr.altFor": "Cod QR pentru {url}",
  "qr.history": "Istoric descărcări",
  "qr.history.loading": "Se încarcă…",
  "qr.history.empty": "Descărcările salvate vor apărea aici.",
  "qr.history.download": "Descarcă",
  "qr.history.delete": "Șterge",
  "qr.history.confirmDelete.title": "Ștergi exportul?",
  "qr.history.confirmDelete": "Fișierul salvat va fi eliminat definitiv din istoric.",

  // Language switcher
  "lang.label": "Limbă",
  "lang.ro": "Română",
  "lang.en": "Engleză",
  "lang.fr": "Franceză",

  // Translate (AI)
  "translate.toEn": "Traduceți în engleză",
  "translate.toRo": "Traduceți în română",
  "translate.toFr": "Traduceți în franceză",
  "translate.fillFr": "Completează FR",
  "translate.fillFr.done": "{n} câmpuri completate în franceză",
  "translate.fillEn": "Completează EN",
  "translate.fillEn.done": "{n} câmpuri completate în engleză",
  "translate.loading": "Se traduce…",
  "translate.error": "Traducerea a eșuat",
  "translate.empty": "Nu există text de tradus",
};

const EN: Dict = {
  "brand.title": "House Tales",
  "brand.tagline": "Urban archive",
  "nav.admin": "Admin",
  "nav.viewSite": "View site",
  "nav.signOut": "Sign out",
  "nav.back": "Back",
  "nav.backHome": "Back home",
  "nav.backArchive": "Archive",

  "home.badge": "Building chronicles",
  "home.h1.a": "Discover the story behind",
  "home.h1.b": "every wall",
  "home.lead": "Every stone of the city carries a memory. Scan a QR code on a façade or browse the archive to step into the urban chronicle of historic buildings.",
  "home.archive": "Building archive",
  "home.records.one": "record",
  "home.records.many": "records",
  "home.loading": "Turning the pages of the archive…",
  "home.empty": "The archive is still empty. Sign in as admin to add the first chronicle.",
  "home.error": "The archive could not be loaded. Check your connection and try again.",
  "home.pagination.perPage": "Per page",
  "home.pagination.pageOf": "Page {page} of {total}",
  "home.pagination.prev": "Previous",
  "home.pagination.next": "Next",
  "home.pagination.first": "First",
  "home.pagination.last": "Last",
  "home.footer": "House Tales · The city's memory",

  "building.chronicle": "Building chronicle",
  "building.gallery": "Gallery",
  "building.image.one": "image",
  "building.image.many": "images",
  "building.notFound.title": "Building not found",
  "building.notFound.desc": "This QR code may be out of date.",
  "building.error.title": "This page couldn't be loaded",

  "root.404.title": "Page not found",
  "root.404.desc": "The page you're looking for doesn't exist or has been moved.",
  "root.404.back": "Back to home page",
  "root.error.title": "This page didn't load",
  "root.error.desc": "Something went wrong. Try reloading or head back to the home page.",
  "root.error.retry": "Try again",

  "auth.admin": "Admin",
  "auth.signin": "Sign in",
  "auth.signup": "Create an account",
  "auth.register": "Register",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.help": "Admin access is granted separately. Contact the site owner if you need it.",
  "auth.toSignup": "No account? Sign up",
  "auth.toSignin": "Already have an account? Sign in",
  "auth.error.generic": "Something went wrong",
  "auth.forgot": "Forgot your password?",
  "auth.reset.title": "Reset password",
  "auth.reset.desc": "Enter the email of your admin account and we will send you a reset link.",
  "auth.reset.send": "Send reset link",
  "auth.reset.sent": "We sent an email with the reset link. Check your inbox.",
  "auth.reset.back": "Back to sign in",
  "auth.newPassword.title": "Set a new password",
  "auth.newPassword.desc": "Choose a new password for your admin account.",
  "auth.newPassword.field": "New password",
  "auth.newPassword.confirm": "Confirm password",
  "auth.newPassword.save": "Save password",
  "auth.newPassword.mismatch": "Passwords do not match",
  "auth.newPassword.done": "Your password has been changed.",
  "auth.newPassword.invalidLink": "Invalid or expired link. Request a new reset link.",

  "admin.title": "Manage buildings",
  "admin.all": "All buildings",
  "admin.new": "New building",
  "admin.empty": "No buildings yet. Create the first one.",
  "admin.error": "The building list could not be loaded. Check your connection and try again.",
  "admin.loading": "Loading…",
  "admin.copyUrl": "Copy URL",
  "admin.copied": "Copied!",
  "admin.viewPublic": "View public page",
  "admin.view": "View",
  "admin.edit": "Edit",
  "admin.editBuilding": "Edit building",
  "admin.delete": "Delete",
  "admin.deleteBuilding": "Delete building",
  "admin.confirmDelete.title": "Delete building?",
  "admin.confirmDelete": "Delete \"{name}\"? This action cannot be undone.",
  "admin.hint": "Tip: copy the public URL of each building and paste it into any QR code generator (e.g. qrcode-monkey.com) to print a QR sticker for the wall.",
  "admin.unauthorized.title": "Not authorized",
  "admin.unauthorized.desc": "Your account is signed in but has no admin rights. Contact the site owner for access.",
  "common.cancel": "Cancel",
  "common.confirm": "Confirm",
  "common.delete": "Delete",

  "form.newBuilding": "New building",
  "form.create": "Create",
  "form.save": "Save changes",
  "form.saving": "Saving…",
  "form.createFailed": "Creation failed",
  "form.saveFailed": "Save failed",

  "field.name": "Name *",
  "field.slug": "URL identifier * (used in the address: /b/<slug>)",
  "field.slug.hint": "Lowercase letters, digits and dashes only. E.g. casa-batllo",
  "field.address": "Address",
  "field.year": "Year built",
  "field.year.hint": "Accepts any format: exact year, range or approximate.",
  "field.year.placeholder": "e.g. 1904, 1940-1942 or c. 1900",
  "field.architect": "Architect",
  "err.year.max": "Year can be at most 50 characters.",
  "err.name.required": "Name is required.",
  "err.name.min": "Name must be at least 2 characters.",
  "err.name.max": "Name can be at most 150 characters.",
  "err.slug.required": "URL identifier is required.",
  "err.slug.min": "Identifier must be at least 2 characters.",
  "err.slug.max": "Identifier can be at most 100 characters.",
  "err.slug.format": "Use lowercase letters, digits and dashes only.",
  "field.cover": "Cover image",
  "field.uploadCover": "Upload image",
  "field.short": "Short description",
  "field.history": "History",
  "err.short.max": "Short description is too long (max 500 characters).",
  
  "form.checkOne": "Fix the highlighted field before saving.",
  "form.checkMany": "Fix the {n} highlighted fields before saving.",

  "gallery.title": "Gallery",
  "gallery.empty": "No images in the gallery yet.",
  "gallery.urlPlaceholder": "Image URL (https://…) or use the upload button",
  "gallery.uploadLabel": "Upload to gallery",
  "gallery.captionPlaceholder": "Caption (optional)",
  "gallery.captionPlaceholder.en": "Caption EN (optional)",
  "gallery.captionPlaceholder.fr": "Caption FR (optional)",
  "gallery.edit": "Edit caption",
  "gallery.saveCaptions": "Save",
  "gallery.cancel": "Cancel",
  "gallery.add": "Add image",
  "gallery.deleteImage": "Delete image",
  "gallery.confirmDelete.title": "Delete image?",
  "gallery.confirmDelete": "This image will be permanently removed from the gallery.",

  "upload.default": "Upload image",
  "upload.uploading": "Uploading…",
  "upload.formatHelp": "PNG, JPG, WEBP or GIF · max {mb} MB",
  "upload.err.type": "Unsupported format{parens}. Only PNG, JPG, WEBP or GIF are allowed.",
  "upload.err.empty": "The file is empty.",
  "upload.err.size": "The image is too large ({size}). Maximum size is {mb} MB.",
  "upload.err.generic": "Upload failed. Try again.",

  "qr.title": "QR code",
  "qr.hint": "Generated from the URL identifier. Scan to test:",
  "qr.downloadPng": "Download PNG",
  "qr.downloadPdf": "Download PDF",
  "qr.downloading": "Downloading…",
  "qr.generating": "Generating…",
  "qr.open": "Open",
  "qr.autoSave": "Each download is automatically saved to the building's history.",
  "qr.afterSave": "Download history is available after you save the building.",
  "qr.saveFailed": "The download succeeded, but it couldn't be saved to the history.",
  "qr.needSlug": "Fill in the URL identifier to generate the QR code.",
  "qr.altFor": "QR code for {url}",
  "qr.history": "Download history",
  "qr.history.loading": "Loading…",
  "qr.history.empty": "Saved downloads will appear here.",
  "qr.history.download": "Download",
  "qr.history.delete": "Delete",
  "qr.history.confirmDelete.title": "Delete export?",
  "qr.history.confirmDelete": "The saved file will be permanently removed from history.",

  "lang.label": "Language",
  "lang.ro": "Romanian",
  "lang.en": "English",
  "lang.fr": "French",

  "translate.toEn": "Translate to English",
  "translate.toRo": "Translate to Romanian",
  "translate.toFr": "Translate to French",
  "translate.fillFr": "Fill French",
  "translate.fillFr.done": "{n} fields filled in French",
  "translate.fillEn": "Fill English",
  "translate.fillEn.done": "{n} fields filled in English",
  "translate.loading": "Translating…",
  "translate.error": "Translation failed",
  "translate.empty": "No text to translate",
};

const FR: Dict = {
  "brand.title": "Contes de Maisons",
  "brand.tagline": "Archive urbaine",
  "nav.admin": "Administration",
  "nav.viewSite": "Voir le site",
  "nav.signOut": "Se déconnecter",
  "nav.back": "Retour",
  "nav.backHome": "Retour à l'accueil",
  "nav.backArchive": "Archive",

  "home.badge": "Chroniques des bâtiments",
  "home.h1.a": "Découvrez l'histoire derrière",
  "home.h1.b": "chaque mur",
  "home.lead": "Chaque pierre de la ville porte une mémoire. Scannez un code QR sur une façade ou parcourez l'archive pour entrer dans la chronique urbaine des bâtiments historiques.",
  "home.archive": "Archive des bâtiments",
  "home.records.one": "fiche",
  "home.records.many": "fiches",
  "home.loading": "Ouverture des pages de l'archive…",
  "home.empty": "L'archive est encore vide. Connectez-vous en tant qu'administrateur pour ajouter la première chronique.",
  "home.error": "Impossible de charger l'archive. Vérifiez votre connexion et réessayez.",
  "home.pagination.perPage": "Par page",
  "home.pagination.pageOf": "Page {page} sur {total}",
  "home.pagination.prev": "Précédent",
  "home.pagination.next": "Suivant",
  "home.pagination.first": "Première",
  "home.pagination.last": "Dernière",
  "home.footer": "Contes de Maisons · La mémoire de la ville",

  "building.chronicle": "Chronique du bâtiment",
  "building.gallery": "Galerie",
  "building.image.one": "image",
  "building.image.many": "images",
  "building.notFound.title": "Bâtiment introuvable",
  "building.notFound.desc": "Ce code QR est peut-être obsolète.",
  "building.error.title": "Impossible de charger cette page",

  "root.404.title": "Page introuvable",
  "root.404.desc": "La page que vous cherchez n'existe pas ou a été déplacée.",
  "root.404.back": "Retour à l'accueil",
  "root.error.title": "Cette page ne s'est pas chargée",
  "root.error.desc": "Une erreur est survenue. Essayez de recharger ou de revenir à l'accueil.",
  "root.error.retry": "Réessayer",

  "auth.admin": "Administration",
  "auth.signin": "Connexion",
  "auth.signup": "Créer un compte",
  "auth.register": "S'inscrire",
  "auth.email": "E-mail",
  "auth.password": "Mot de passe",
  "auth.help": "L'accès administrateur est accordé séparément. Contactez le propriétaire du site si nécessaire.",
  "auth.toSignup": "Pas de compte ? Inscrivez-vous",
  "auth.toSignin": "Vous avez déjà un compte ? Connectez-vous",
  "auth.error.generic": "Une erreur est survenue",
  "auth.forgot": "Mot de passe oublié ?",
  "auth.reset.title": "Réinitialiser le mot de passe",
  "auth.reset.desc": "Saisissez l'e-mail de votre compte administrateur et nous vous enverrons un lien de réinitialisation.",
  "auth.reset.send": "Envoyer le lien",
  "auth.reset.sent": "Nous avons envoyé un e-mail avec le lien de réinitialisation.",
  "auth.reset.back": "Retour à la connexion",
  "auth.newPassword.title": "Définir un nouveau mot de passe",
  "auth.newPassword.desc": "Choisissez un nouveau mot de passe pour votre compte administrateur.",
  "auth.newPassword.field": "Nouveau mot de passe",
  "auth.newPassword.confirm": "Confirmer le mot de passe",
  "auth.newPassword.save": "Enregistrer le mot de passe",
  "auth.newPassword.mismatch": "Les mots de passe ne correspondent pas",
  "auth.newPassword.done": "Votre mot de passe a été modifié.",
  "auth.newPassword.invalidLink": "Lien invalide ou expiré. Demandez un nouveau lien.",

  "admin.title": "Gérer les bâtiments",
  "admin.all": "Tous les bâtiments",
  "admin.new": "Nouveau bâtiment",
  "admin.empty": "Aucun bâtiment. Créez le premier.",
  "admin.error": "La liste des bâtiments n'a pas pu être chargée. Vérifiez votre connexion et réessayez.",
  "admin.loading": "Chargement…",
  "admin.copyUrl": "Copier l'URL",
  "admin.copied": "Copié !",
  "admin.viewPublic": "Voir la page publique",
  "admin.view": "Voir",
  "admin.edit": "Modifier",
  "admin.editBuilding": "Modifier le bâtiment",
  "admin.delete": "Supprimer",
  "admin.deleteBuilding": "Supprimer le bâtiment",
  "admin.confirmDelete.title": "Supprimer le bâtiment ?",
  "admin.confirmDelete": "Supprimer « {name} » ? Cette action est irréversible.",
  "admin.hint": "Astuce : copiez l'URL publique de chaque bâtiment et collez-la dans un générateur de code QR (par ex. qrcode-monkey.com) pour produire un autocollant à poser sur le mur.",
  "admin.unauthorized.title": "Non autorisé",
  "admin.unauthorized.desc": "Votre compte est connecté mais n'a pas de droits d'administrateur. Contactez le propriétaire du site pour obtenir l'accès.",
  "common.cancel": "Annuler",
  "common.confirm": "Confirmer",
  "common.delete": "Supprimer",

  "form.newBuilding": "Nouveau bâtiment",
  "form.create": "Créer",
  "form.save": "Enregistrer les modifications",
  "form.saving": "Enregistrement…",
  "form.createFailed": "La création a échoué",
  "form.saveFailed": "L'enregistrement a échoué",

  "field.name": "Nom *",
  "field.slug": "Identifiant URL * (utilisé dans l'adresse : /b/<slug>)",
  "field.slug.hint": "Lettres minuscules, chiffres et tirets uniquement. Ex. casa-batllo",
  "field.address": "Adresse",
  "field.year": "Année de construction",
  "field.year.hint": "Accepte tout format : année exacte, intervalle ou approximatif.",
  "field.year.placeholder": "ex. 1904, 1940-1942 ou v. 1900",
  "field.architect": "Architecte",
  "err.year.max": "L'année ne peut dépasser 50 caractères.",
  "err.name.required": "Le nom est obligatoire.",
  "err.name.min": "Le nom doit contenir au moins 2 caractères.",
  "err.name.max": "Le nom ne peut dépasser 150 caractères.",
  "err.slug.required": "L'identifiant URL est obligatoire.",
  "err.slug.min": "L'identifiant doit contenir au moins 2 caractères.",
  "err.slug.max": "L'identifiant ne peut dépasser 100 caractères.",
  "err.slug.format": "Utilisez uniquement des lettres minuscules, chiffres et tirets.",
  "field.cover": "Image principale",
  "field.uploadCover": "Téléverser une image",
  "field.short": "Description courte",
  "field.history": "Histoire",
  "err.short.max": "La description courte est trop longue (max. 500 caractères).",

  "form.checkOne": "Corrigez le champ signalé avant d'enregistrer.",
  "form.checkMany": "Corrigez les {n} champs signalés avant d'enregistrer.",

  "gallery.title": "Galerie",
  "gallery.empty": "Aucune image dans la galerie pour l'instant.",
  "gallery.urlPlaceholder": "URL de l'image (https://…) ou utilisez le bouton de téléversement",
  "gallery.uploadLabel": "Téléverser dans la galerie",
  "gallery.captionPlaceholder": "Légende (facultatif)",
  "gallery.captionPlaceholder.en": "Légende EN (facultatif)",
  "gallery.captionPlaceholder.fr": "Légende FR (facultatif)",
  "gallery.edit": "Modifier la légende",
  "gallery.saveCaptions": "Enregistrer",
  "gallery.cancel": "Annuler",
  "gallery.add": "Ajouter une image",
  "gallery.deleteImage": "Supprimer l'image",
  "gallery.confirmDelete.title": "Supprimer l'image ?",
  "gallery.confirmDelete": "Cette image sera définitivement retirée de la galerie.",

  "upload.default": "Téléverser une image",
  "upload.uploading": "Téléversement…",
  "upload.formatHelp": "PNG, JPG, WEBP ou GIF · max. {mb} Mo",
  "upload.err.type": "Format non pris en charge{parens}. Seuls PNG, JPG, WEBP ou GIF sont acceptés.",
  "upload.err.empty": "Le fichier est vide.",
  "upload.err.size": "L'image est trop grande ({size}). Taille maximale : {mb} Mo.",
  "upload.err.generic": "Le téléversement a échoué. Réessayez.",

  "qr.title": "Code QR",
  "qr.hint": "Généré à partir de l'identifiant URL. Scannez pour tester :",
  "qr.downloadPng": "Télécharger en PNG",
  "qr.downloadPdf": "Télécharger en PDF",
  "qr.downloading": "Téléchargement…",
  "qr.generating": "Génération…",
  "qr.open": "Ouvrir",
  "qr.autoSave": "Chaque téléchargement est enregistré automatiquement dans l'historique du bâtiment.",
  "qr.afterSave": "L'historique des téléchargements sera disponible après avoir enregistré le bâtiment.",
  "qr.saveFailed": "Le téléchargement a réussi, mais il n'a pas pu être enregistré dans l'historique.",
  "qr.needSlug": "Renseignez l'identifiant URL pour générer le code QR.",
  "qr.altFor": "Code QR pour {url}",
  "qr.history": "Historique des téléchargements",
  "qr.history.loading": "Chargement…",
  "qr.history.empty": "Les téléchargements enregistrés apparaîtront ici.",
  "qr.history.download": "Télécharger",
  "qr.history.delete": "Supprimer",
  "qr.history.confirmDelete.title": "Supprimer l'export ?",
  "qr.history.confirmDelete": "Le fichier enregistré sera définitivement retiré de l'historique.",

  "lang.label": "Langue",
  "lang.ro": "Roumain",
  "lang.en": "Anglais",
  "lang.fr": "Français",

  "translate.toEn": "Traduire en anglais",
  "translate.toRo": "Traduire en roumain",
  "translate.toFr": "Traduire en français",
  "translate.fillFr": "Remplir FR",
  "translate.fillFr.done": "{n} champs remplis en français",
  "translate.fillEn": "Remplir EN",
  "translate.fillEn.done": "{n} champs remplis en anglais",
  "translate.loading": "Traduction…",
  "translate.error": "La traduction a échoué",
  "translate.empty": "Aucun texte à traduire",
};

const DICTS: Record<Lang, Dict> = { ro: RO, en: EN, fr: FR };

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  locale: string;
};

const I18nContext = createContext<Ctx | null>(null);

function interpolate(str: string, vars?: Record<string, string | number>) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useIsomorphicLayoutEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "ro" || saved === "en" || saved === "fr") setLangState(saved);
    } catch {}
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const dict = DICTS[lang];
      const raw = dict[key] ?? RO[key] ?? key;
      return interpolate(raw, vars);
    },
    [lang],
  );

  const locale = lang === "ro" ? "ro-RO" : lang === "fr" ? "fr-FR" : "en-US";

  return <I18nContext.Provider value={{ lang, setLang, t, locale }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so components used outside a provider still render.
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (k, v) => interpolate(RO[k] ?? k, v),
      locale: "ro-RO",
    };
  }
  return ctx;
}

export function useT() {
  return useI18n().t;
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t("lang.label")}
      className={`inline-flex items-center rounded-md border border-border/70 bg-background overflow-hidden text-xs uppercase tracking-widest ${className}`}
    >
      {LANGS.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            aria-pressed={active}
            className={`min-h-9 px-2.5 py-1.5 font-semibold transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
            }`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
