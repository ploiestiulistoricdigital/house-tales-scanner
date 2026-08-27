// Per-user rate limiting for server functions (mitigates cost-amplification /
// DoS on mutating endpoints and the billed translateText call). Counters live
// in public.rate_limits, checked atomically via the public.check_rate_limit()
// SQL function — both are locked down to service_role only.
export async function assertRateLimit(
  userId: string,
  action: string,
  max: number,
  windowSeconds: number,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_key: `${action}:${userId}`,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Rate limit exceeded. Please try again shortly.");
}
