/**
 * Auth API response schemas (Zod). Used for validation in apiClient to prevent shape mismatch crashes.
 */

import { z } from 'zod';

/** Login / refresh success: { success, data: { accessToken?, refreshToken?, user? } } */
export const AuthDataSchema = z.object({
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  user: z.record(z.unknown()).optional(),
  token: z.string().optional(),
}).passthrough();

export const LoginResponseSchema = z.object({
  success: z.boolean().optional(),
  data: AuthDataSchema.optional(),
}).passthrough();

export default { LoginResponseSchema, AuthDataSchema };
