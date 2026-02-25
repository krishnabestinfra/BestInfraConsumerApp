/**
 * Constants and design tokens for the Invoices screen.
 * Keeps the main Invoices.js lean and allows reuse.
 */
export const INVOICE_FILTERS = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "unpaid", label: "Unpaid" },
];

export const INVOICE_LIST_SEPARATOR_HEIGHT = 16;

export const SHIMMER_LIGHT = {
  base: "#e0e0e0",
  gradient: ["#e0e0e0", "#f5f5f5", "#e0e0e0"],
};

export const SHIMMER_DARK = {
  base: "#3a3a3c",
  gradient: ["#3a3a3c", "rgba(255,255,255,0.06)", "#3a3a3c"],
};
