Relax the `year_built` validation in `src/components/BuildingForm.tsx` so admins can enter free-form values like `1931-1934`, `c. 1900`, or `1904`.

Changes:
- Remove the integer-only regex + range check for `year_built`.
- Keep it as a plain text input (already is), max 50 chars (matches server Zod `max(50)`).
- Update the hint to say something like "Any format, e.g. 1904 or 1931–1934".
- Remove the now-unused `err.year.int` / `err.year.range` i18n keys (RO + EN) in `src/lib/i18n.tsx`, and update `field.year.hint` copy.

No DB or server changes — the `year_built` column is already TEXT and the server accepts any string up to 50 chars.