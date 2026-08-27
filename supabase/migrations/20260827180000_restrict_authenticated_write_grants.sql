-- Restrict the `authenticated` role's table-level GRANTs on buildings and
-- building_images to SELECT (SEC-5). RLS policies already gate INSERT/UPDATE/
-- DELETE to admins via has_role(), but the broad GRANT meant an accidentally
-- disabled or misconfigured RLS policy would let any logged-in user write
-- directly. Writes now go exclusively through the service-role client after
-- an application-level assertAdmin() check, matching the pattern already
-- used for qr_code_exports.

REVOKE INSERT, UPDATE, DELETE ON public.buildings FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.building_images FROM authenticated;
