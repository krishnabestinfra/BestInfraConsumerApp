/**
 * Central config for which screens/features are enabled.
 * Use for plan-based or A/B features; keeps flow scalable as features grow.
 */
export const featureFlags = {
  /** Dashboard: use unified PostPaidDashboard when true */
  useUnifiedDashboard: true,
  /** Notifications screen */
  notifications: true,
  /** Reports screen */
  reports: true,
  /** Tickets & Chat Support */
  tickets: true,
  chatSupport: true,
  /** Invoices & Transactions */
  invoices: true,
  transactions: true,
  /** Recharge / Payments */
  recharge: true,
  payments: true,
};

/**
 * Check if a feature is enabled (for conditional navigation or UI).
 */
export function isFeatureEnabled(key) {
  return featureFlags[key] === true;
}

export default featureFlags;
