# Extindere site cu conținutul ATOM Ploiești

Conținutul de pe atomploiesti.ro poate fi preluat: pagina principală și API-ul de conținut al site-ului răspund, iar textele pentru „Despre noi”, „Proiecte”, articole și contact sunt accesibile.

## Ce se preia

- **Despre asociație** — text de prezentare a Societății Culturale „ATOM” Ploiești (înființată 2018, misiune culturală) + secțiunea „Poți ajuta” (redirecționarea a 3,5% din impozit) și îndemnul de înscriere ca membru.
- **Proiecte** — lista de volume publicate (2017–2026, cu autor și an), plus proiectul curent evidențiat pe site.
- **Noutăți / articole** — cele mai recente articole (titlu, dată, rezumat scurt, imagine dacă există) cu link către articolul original de pe atomploiesti.ro pentru textul integral.
- **Contact & social** — date de contact, Facebook, email/newsletter, link către cererea de adeziune.

## Pagini noi (rute separate, nu ancore)

```text
/despre     -> Despre asociație + misiune + Poți ajuta
/proiecte   -> Lista de volume/proiecte
/noutati    -> Articole recente (card-uri, link către sursă)
/contact    -> Contact, social, înscriere membru
```

Se adaugă navigație în header-ul paginii principale (Acasă, Despre, Proiecte, Noutăți, Contact, Arhivă case) și în footer, păstrând tema caldă existentă (Cormorant Garamond / Lora, paletă teracotă-sepia) și sigla ATOM.

## Conținut trilingv

Conținutul este scris direct în cod (pagini statice, fără administrare), în trei variante: RO (textul original), EN și FR (traduceri generate acum, la implementare). Se folosește același selector de limbă existent, deci schimbarea limbii comută instant textele pe toate paginile noi. RO rămâne implicit.

## Detalii tehnice

- Preluarea se face o singură dată, cu scraping prin gateway (pagini + API-ul WordPress al site-ului) pentru texte, date și URL-uri de imagini; rezultatul e revizuit și scris în module de conținut TypeScript (`src/content/atom/*.ts`) cu câmpuri `ro`/`en`/`fr`.
- Rute noi în `src/routes/despre.tsx`, `proiecte.tsx`, `noutati.tsx`, `contact.tsx`, fiecare cu `head()` propriu (title, description, og:title, og:description) în limba RO.
- Cheile de navigație se adaugă în dicționarul din `src/lib/i18n.tsx`; textele lungi de pagină stau în modulele de conținut, nu în dicționar.
- Imaginile din articole se afișează prin URL-ul original de pe atomploiesti.ro (fără copiere în storage), cu `loading="lazy"` și `alt`.
- Fără schimbări de bază de date și fără modificări la portalul de administrare a caselor.

## Notă

Articolele vor fi un instantaneu la momentul implementării — nu se actualizează automat când apar articole noi pe atomploiesti.ro. Dacă vrei actualizare automată mai târziu, se poate adăuga separat.
