/**
 * Payment API response schemas (Zod). Used for validation in apiClient.
 */

import { z } from 'zod';

/** Create payment link response */
export const PaymentCreateLinkSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    order_id: z.string().optional(),
    amount: z.union([z.number(), z.string()]).optional(),
    currency: z.string().optional(),
    key_id: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

/** Payment verify response */
export const PaymentVerifySchema = z.object({
  success: z.boolean().optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

export default { PaymentCreateLinkSchema, PaymentVerifySchema };
