
## Overview
A full-stack app where visitors scan a QR code on a building's wall, land on a public page with that building's history, photos, and info. Admins manage all content through a protected backend.

## Stack
- TanStack Start (already set up)
- Lovable Cloud (Postgres, Auth, Storage) — needs to be enabled
- Single admin role (first signup becomes admin; further admins added manually)

## Data model
`buildings` table:
- `id` (uuid), `slug` (unique, used in URL), `name`, `address`, `year_built`, `architect`, `short_description`, `history` (long rich text/markdown), `cover_image_url`, `created_at`, `updated_at`

`building_images` table:
- `id`, `building_id` (fk), `image_url`, `caption`, `sort_order`

`user_roles` table (secure role storage pattern):
- `id`, `user_id`, `role` (enum: admin)
- `has_role()` security-definer function
- RLS: only admins can write buildings/images; public can read

Storage bucket `building-images` (public read).

## Routes
Public:
- `/` — landing page listing all buildings (grid of cards) with search
- `/b/$slug` — the QR target page: hero image, name/address/year, gallery, full history. Mobile-first, responsive.

Admin (under `_authenticated/`, gated by admin role check):
- `/admin` — dashboard listing all buildings, "New building" button, per-row edit/delete, and each row shows the public URL (for QR generation externally)
- `/admin/buildings/new` — create form
- `/admin/buildings/$id/edit` — edit form with fields, cover image upload, gallery manager (upload/reorder/caption/delete photos)

Auth:
- `/auth` — email+password sign-in (single admin role, no public signup UI beyond first-admin bootstrap)

## Key UI details
- Public building page: large hero, sticky building name, meta chips (year, architect, address), formatted history text, photo gallery with lightbox
- Admin uses shadcn forms, table, dialogs; image upload via Cloud storage; URL field shows `/b/{slug}` copy button
- Non-admin authenticated users see "Not authorized" on `/admin`

## Technical notes
- Public reads via server publishable client + `TO anon` SELECT policy on buildings/images
- Admin writes via `requireSupabaseAuth` server functions that verify `has_role(userId, 'admin')` before mutating
- Slug auto-generated from name, editable, uniqueness validated
- Head metadata per building page (title = building name, description = short_description, og:image = cover)

## Out of scope (single language, URLs only for QR)
- No in-app QR image generator (admin copies URL to use with any QR tool)
- No i18n
- No audio/video content
