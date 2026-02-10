// Demo data and helpers used when logging in with demo credentials.
// This allows the app to show complete, realistic data even if the
// backend or database is unavailable.

// All identifiers that should be treated as demo users.
// Keep this in sync with the dummy credentials in Login.js.
export const DEMO_IDENTIFIERS = [
  "demo",
  "test",
  "admin",
  "user",
  // Demo consumer UIDs
  "BI25GMRA001",
  "BI25GMRA002",
  "BI25GMRA003",
  "BI25GMRA004",
  "BI25GMRA005",
  "BI25GMRA006",
  "BI25GMRA007",
  "BI25GMRA008",
  "BI25GMRA009",
  "BI25GMRA010",
  "BI25GMRA011",
  "BI25GMRA012",
  "BI25GMRA013",
  "BI25GMRA014",
  "BI25GMRA015",
  "BI25GMRA016",
  "BI25GMRA017",
  "BI25GMRA018",
  "BI25GMRA019",
  "BI25GMRA020",
];

export const isDemoUser = (identifier) => {
  if (!identifier) return false;
  const trimmed = String(identifier).trim();
  return DEMO_IDENTIFIERS.includes(trimmed);
};

// --------- DASHBOARD / USAGE DEMO DATA ----------

// Basic chart data used by both dashboard and usage screens
// Daily: 30 days of non‑zero data so 7D and 30D views are fully filled
const DEMO_DAILY_SERIES = [
  118, 122, 125, 130, 128, 135, 140, 142, 138, 145,
  150, 148, 152, 155, 149, 160, 158, 162, 165, 168,
  170, 169, 172, 175, 178, 180, 182, 185, 188, 190,
];
const DEMO_DAILY_LABELS = [
  "01 Jan 2026",
  "02 Jan 2026",
  "03 Jan 2026",
  "04 Jan 2026",
  "05 Jan 2026",
  "06 Jan 2026",
  "07 Jan 2026",
  "08 Jan 2026",
  "09 Jan 2026",
  "10 Jan 2026",
  "11 Jan 2026",
  "12 Jan 2026",
  "13 Jan 2026",
  "14 Jan 2026",
  "15 Jan 2026",
  "16 Jan 2026",
  "17 Jan 2026",
  "18 Jan 2026",
  "19 Jan 2026",
  "20 Jan 2026",
  "21 Jan 2026",
  "22 Jan 2026",
  "23 Jan 2026",
  "24 Jan 2026",
  "25 Jan 2026",
  "26 Jan 2026",
  "27 Jan 2026",
  "28 Jan 2026",
  "29 Jan 2026",
  "30 Jan 2026",
];

// Monthly: 12 months of non‑zero data so 90D (3 months) and 1Y (12 months) are filled
const DEMO_MONTHLY_SERIES = [
  1750, // Mar 2025
  1820, // Apr
  1895, // May
  1930, // Jun
  1980, // Jul
  2050, // Aug
  2120, // Sep
  2185, // Oct
  2250, // Nov
  2310, // Dec
  2380, // Jan 2026
  2450, // Feb 2026
];
const DEMO_MONTHLY_LABELS = [
  "Mar 2025",
  "Apr 2025",
  "May 2025",
  "Jun 2025",
  "Jul 2025",
  "Aug 2025",
  "Sep 2025",
  "Oct 2025",
  "Nov 2025",
  "Dec 2025",
  "Jan 2026",
  "Feb 2026",
];

export const getDemoConsumerCore = (identifier) => {
  const trimmed = String(identifier || "demo").trim();
  const friendlyName =
    trimmed === "demo"
      ? "Demo Consumer"
      : trimmed === "test"
      ? "Test Consumer"
      : trimmed.startsWith("BI25GMRA")
      ? `GMR Consumer ${trimmed.slice(-3)}`
      : "Best Infra Consumer";

  const now = new Date();

  return {
    name: friendlyName,
    consumerName: friendlyName,
    identifier: trimmed,
    consumerNumber: trimmed,
    uniqueIdentificationNo: trimmed,
    meterSerialNumber: "24021286",
    meterNumber: "24021286",
    meterId: "DEMO-METER-001",
    readingDate: now.toISOString(),
    totalOutstanding: 2060.0,
  };
};

export const getDemoDashboardConsumerData = (identifier) => {
  const core = getDemoConsumerCore(identifier);

  return {
    ...core,
    // Consumption summary & chart data
    chartData: {
      daily: {
        seriesData: [{ data: DEMO_DAILY_SERIES }],
        xAxisData: DEMO_DAILY_LABELS,
      },
      monthly: {
        seriesData: [{ data: DEMO_MONTHLY_SERIES }],
        xAxisData: DEMO_MONTHLY_LABELS,
      },
    },
    // Simple demo tamper events list for Alerts table
    alerts: [
      {
        id: 1,
        meterSerialNumber: core.meterSerialNumber,
        consumerName: core.name,
        tamperDatetime: "2026-01-10T08:42:00Z",
        tamperTypeDesc: "R_PH CT Open",
        status: "Active",
        durationMinutes: 95,
      },
      {
        id: 2,
        meterSerialNumber: core.meterSerialNumber,
        consumerName: core.name,
        tamperDatetime: "2026-01-06T11:15:00Z",
        tamperTypeDesc: "Voltage Imbalance",
        status: "Resolved",
        durationMinutes: 30,
      },
    ],
    // Phase values for vector diagram (Usage screen)
    rPhaseVoltage: 233,
    yPhaseVoltage: 231,
    bPhaseVoltage: 235,
    rPhaseCurrent: 62,
    yPhaseCurrent: 58,
    bPhaseCurrent: 60,
    rPhasePowerFactor: 0.96,
    yPhasePowerFactor: 0.95,
    bPhasePowerFactor: 0.97,
    kW: 145.3,
  };
};

export const getDemoUsageConsumerData = getDemoDashboardConsumerData;

// Demo last month bill amount for Usage screen
export const DEMO_LAST_MONTH_BILL = 18340.75;

// --------- TICKETS DEMO DATA ----------

export const DEMO_TICKET_STATS = {
  total: 4,
  open: 1,
  inProgress: 2,
  resolved: 1,
  closed: 0,
};

export const DEMO_TICKETS = [
  {
    id: "DEMO-TKT-001",
    ticketNumber: "TKT-2401",
    category: "METER",
    status: "Open",
    priority: "High",
    subject: "Meter communication issue",
  },
  {
    id: "DEMO-TKT-002",
    ticketNumber: "TKT-2402",
    category: "BILLING",
    status: "In Progress",
    priority: "Low",
    subject: "Clarification on last invoice",
  },
  {
    id: "DEMO-TKT-003",
    ticketNumber: "TKT-2403",
    category: "TECHNICAL",
    status: "In Progress",
    priority: "High",
    subject: "Voltage fluctuation alerts",
  },
  {
    id: "DEMO-TKT-004",
    ticketNumber: "TKT-2404",
    category: "CONNECTION",
    status: "Resolved",
    priority: "High",
    subject: "New connection provisioning",
  },
];

// --------- INVOICES DEMO DATA ----------

export const DEMO_INVOICES = [
  {
    id: 1,
    billNumber: "INV-2401",
    fromDate: "2025-12-01T00:00:00Z",
    toDate: "2025-12-31T23:59:59Z",
    billDate: "2026-01-01T10:00:00Z",
    dueDate: "2026-01-15T10:00:00Z",
    unitsConsumed: 2060,
    totalAmount: 48230.5,
    isPaid: false,
  },
  {
    id: 2,
    billNumber: "INV-23012",
    fromDate: "2025-11-01T00:00:00Z",
    toDate: "2025-11-30T23:59:59Z",
    billDate: "2025-12-01T10:00:00Z",
    dueDate: "2025-12-15T10:00:00Z",
    unitsConsumed: 2340,
    totalAmount: 51210.75,
    isPaid: true,
  },
  {
    id: 3,
    billNumber: "INV-23011",
    fromDate: "2025-10-01T00:00:00Z",
    toDate: "2025-10-31T23:59:59Z",
    billDate: "2025-11-01T10:00:00Z",
    dueDate: "2025-11-15T10:00:00Z",
    unitsConsumed: 1980,
    totalAmount: 46875.0,
    isPaid: true,
  },
];

