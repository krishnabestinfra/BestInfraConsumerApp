/**
 * Billing and invoice date helpers
 *
 * Shared utilities for consumer due dates and billing list date resolution.
 * Use from Dashboard, Invoices, Payments, etc.
 */

/** Values that indicate prepaid (case-insensitive) */
const PREPAID_VALUES = ['prepaid', 'pre-paid', 'pre paid'];

const normalizeToPrepaid = (val) => {
  if (val == null || typeof val !== 'string') return false;
  return PREPAID_VALUES.includes(String(val).trim().toLowerCase());
};

/**
 * Determine if consumer is prepaid. Checks multiple API field names.
 * @param {Object} consumerData - Consumer object from API or demo data
 * @returns {boolean}
 */
export const isPrepaidConsumer = (consumerData) => {
  if (!consumerData || typeof consumerData !== 'object') return false;
  const val =
    consumerData.meterType ??
    consumerData.meter_type ??
    consumerData.billType ??
    consumerData.bill_type ??
    consumerData.statementFor ??
    consumerData.statement_for ??
    consumerData.accountType ??
    consumerData.account_type ??
    consumerData.connectionType; // some APIs use connectionType for prepaid/postpaid
  return normalizeToPrepaid(val);
};

export const getConsumerDueDate = (consumerData) => {
  if (!consumerData || typeof consumerData !== 'object') return null;
  return (
    consumerData.dueDate ??
    consumerData.paymentDueDate ??
    consumerData.due_date ??
    consumerData.payment_due_date ??
    consumerData.outstandingDueDate ??
    consumerData.lastBillDueDate ??
    consumerData.billDueDate ??
    // Prepaid: balance expiry / estimated exhaustion
    consumerData.balanceExpiryDate ??
    consumerData.balance_expiry_date ??
    consumerData.estimatedExhaustionDate ??
    consumerData.estimated_exhaustion_date ??
    null
  );
};

/**
 * Get issue and due date from billing list (latest invoice = most recent by issue date).
 *
 * @param {Array|Object} billingData - Billing list or object with items/records/rows/bills/data
 * @returns {{ issueDate: string|null, dueDate: string|null }}
 */
export const getLatestInvoiceDates = (billingData) => {
  if (!billingData) return { issueDate: null, dueDate: null };
  const list = Array.isArray(billingData)
    ? billingData
    : billingData?.items ??
      billingData?.records ??
      billingData?.rows ??
      billingData?.bills ??
      billingData?.data ??
      [billingData];
  if (!list.length) return { issueDate: null, dueDate: null };
  const sorted = [...list].sort((a, b) => {
    const tA = new Date(a.fromDate || a.createdAt || a.billDate || 0).getTime();
    const tB = new Date(b.fromDate || b.createdAt || b.billDate || 0).getTime();
    return tB - tA;
  });
  const inv = sorted[0];
  return {
    issueDate: inv.fromDate ?? inv.billDate ?? inv.createdAt ?? null,
    dueDate: inv.dueDate ?? null,
  };
};

/**
 * Get timestamp for an invoice (for sorting by issue/created date).
 * Tries fromDate, createdAt, billDate.
 *
 * @param {Object} invoice - Invoice/bill object
 * @returns {number} Time in ms, or 0 if invalid
 */
export const getInvoiceDateValue = (invoice) => {
  if (!invoice) return 0;
  const time = new Date(
    invoice.fromDate || invoice.createdAt || invoice.billDate || 0
  ).getTime();
  return Number.isNaN(time) ? 0 : time;
};

/**
 * Get timestamp for a bill/usage item (for sorting).
 * Tries bill_date, billDate, createdAt, date.
 *
 * @param {Object} bill - Bill/usage object
 * @returns {number} Time in ms, or 0 if invalid
 */
export const getBillDateValue = (bill) => {
  if (!bill) return 0;
  const time = new Date(
    bill.bill_date || bill.billDate || bill.createdAt || bill.date || 0
  ).getTime();
  return Number.isNaN(time) ? 0 : time;
};
