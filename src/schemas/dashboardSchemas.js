/**
 * Dashboard / consumer summary response schemas (Zod). Used for validation in apiClient.
 */

import { z } from 'zod';

/** Consumer or dashboard summary (permissive) */
export const DashboardSummarySchema = z.object({
  success: z.boolean().optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

export default { DashboardSummarySchema };
