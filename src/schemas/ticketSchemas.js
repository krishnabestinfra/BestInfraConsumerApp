/**
 * Tickets API response schemas (Zod). Used for validation in apiClient.
 */

import { z } from 'zod';

/** Single ticket item (permissive for backend variance) */
export const TicketItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  status: z.string().optional(),
  subject: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).passthrough();

/** Tickets stats response: { success?, data?: { open?, closed?, ... } } */
export const TicketStatsSchema = z.object({
  success: z.boolean().optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

/** Tickets table response: array of tickets or { data: [] } */
export const TicketTableSchema = z.object({
  success: z.boolean().optional(),
  data: z.array(TicketItemSchema).optional(),
}).passthrough();

export const TicketTableArraySchema = z.array(TicketItemSchema);

export default { TicketStatsSchema, TicketTableSchema, TicketItemSchema };
