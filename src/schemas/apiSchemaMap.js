/**
 * Central mapping: endpoint URL → Zod schema for response validation.
 * Only endpoints listed here are validated; others pass through unchanged.
 * Used by apiClient to prevent corrupted API shapes from reaching screens.
 */

import { LoginResponseSchema } from './authSchemas';
import { TicketStatsSchema, TicketTableSchema } from './ticketSchemas';
import { PaymentCreateLinkSchema, PaymentVerifySchema } from './paymentSchemas';
import { DashboardSummarySchema } from './dashboardSchemas';

/**
 * Returns the Zod schema for the given endpoint URL, or null if no validation.
 * Match is by path pattern (auth login/refresh, tickets stats/table, payment create-link/verify, consumers get).
 * @param {string} endpoint - Full request URL
 * @returns {import('zod').ZodTypeAny | null}
 */
export function getSchemaForEndpoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'string') return null;
  const url = endpoint.toLowerCase();

  if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
    return LoginResponseSchema;
  }
  if (url.includes('/tickets/stats')) {
    return TicketStatsSchema;
  }
  if (url.includes('/tickets/table')) {
    return TicketTableSchema;
  }
  if (url.includes('/billing/payment/create-link')) {
    return PaymentCreateLinkSchema;
  }
  if (url.includes('/billing/payment/verify')) {
    return PaymentVerifySchema;
  }
  if (url.includes('/consumers/') && !url.includes('/report') && !url.includes('/billing')) {
    return DashboardSummarySchema;
  }

  return null;
}

export default getSchemaForEndpoint;
