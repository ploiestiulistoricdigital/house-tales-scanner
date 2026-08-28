import { z } from "zod";

const UNSAFE_URL_SCHEME = /^(javascript|data|vbscript):/i;

export const safeImageUrl = z
  .string()
  .url()
  .max(2000)
  .refine((url) => !UNSAFE_URL_SCHEME.test(url), "URL scheme not allowed");
