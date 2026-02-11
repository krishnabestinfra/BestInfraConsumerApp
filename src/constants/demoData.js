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
// Daily: 30 days of non‑zero data so 7D and 30D views are fully filled.
// Values are static, but labels are generated dynamically from "today"
// so that 7D always means "last 7 days" and 30D means "last 30 days".
const DEMO_DAILY_SERIES = [
  118, 122, 125, 130, 128, 135, 140, 142, 138, 145,
  150, 148, 152, 155, 149, 160, 158, 162, 165, 168,
  170, 169, 172, 175, 178, 180, 182, 185, 188, 190,
];

const getLastNDaysLabels = (n) => {
  const labels = [];
  // Use "yesterday" as the end date so that
  // the most recent label is the last fully completed day.
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);

    const day = String(d.getDate()).padStart(2, "0");
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    labels.push(`${day} ${month} ${year}`);
  }

  return labels;
};

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

  // Derive high-level dashboard stats from demo series
  const dailyValues = DEMO_DAILY_SERIES;
  const averageDaily =
    dailyValues.length > 0
      ? Math.round(dailyValues.reduce((sum, v) => sum + v, 0) / dailyValues.length)
      : 0;
  const peakUsage = dailyValues.length > 0 ? Math.max(...dailyValues) : 0;

  // Keep these in sync with the key demo invoice units
  const thisMonthKwh = 2060; // Matches DEMO_INVOICES[0].unitsConsumed
  const lastMonthKwh = 2340; // Matches DEMO_INVOICES[1].unitsConsumed
  const savingsKwh = Math.max(lastMonthKwh - thisMonthKwh, 0);

  // Generate daily labels for the last 30 days ending today.
  // 7D and 30D views slice from this array, so:
  // - 7D == last 7 days from today
  // - 30D == last 30 days from today
  const dailyLabels = getLastNDaysLabels(DEMO_DAILY_SERIES.length);

  return {
    ...core,
    // Consumption summary & chart data
    chartData: {
      daily: {
        seriesData: [{ data: DEMO_DAILY_SERIES }],
        xAxisData: dailyLabels,
      },
      monthly: {
        seriesData: [{ data: DEMO_MONTHLY_SERIES }],
        xAxisData: DEMO_MONTHLY_LABELS,
      },
    },
    // Summary statistics used by the PostPaidDashboard "Usage Stats" cards
    dashboardStats: {
      averageDailyKwh: averageDaily,
      peakUsageKwh: peakUsage,
      thisMonthKwh,
      lastMonthKwh,
      savingsKwh,
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
    // Demo billing-related fields for payments / overdue logic
    dueDate: "2026-02-15T00:00:00Z",
    paymentDueDate: "2026-02-15T00:00:00Z",
    outstandingDueDate: "2026-02-15T00:00:00Z",
    lastBillDueDate: "2026-01-15T00:00:00Z",
    billDueDate: "2026-02-15T00:00:00Z",
    // Contact info for payment flows
    email: `${core.identifier}@demo.consumer`,
    contact: "9876543210",
    // Demo bill identifier for payment integration
    billId: "DEMO-BILL-2401",
  };
};

export const getDemoUsageConsumerData = getDemoDashboardConsumerData;

// Demo last month bill amount for Usage screen
export const DEMO_LAST_MONTH_BILL = 18340.75;

// Detailed consumer snapshot used by ConsumerDetailsBottomSheet
export const getDemoConsumerDetails = (identifier) => {
  const core = getDemoDashboardConsumerData(identifier);

  return {
    name: core.name,
    consumerNumber: core.consumerNumber,
    meterSerialNumber: core.meterSerialNumber,
    uniqueIdentificationNo: core.uniqueIdentificationNo,
    meterPhase: 3,
    occupancyStatus: "Active",
    readingDate: core.readingDate,
    rPhaseVoltage: core.rPhaseVoltage,
    yPhaseVoltage: core.yPhaseVoltage,
    bPhaseVoltage: core.bPhaseVoltage,
    rPhaseCurrent: core.rPhaseCurrent,
    yPhaseCurrent: core.yPhaseCurrent,
    bPhaseCurrent: core.bPhaseCurrent,
  };
};

// --------- LS (Load Survey) DEMO DATA (Daily - 96 intervals) ----------

// Generate 96 x 15‑minute intervals for a single day
export const getDemoLsDataForDate = (identifier, formattedDate, meterId) => {
  // Use midnight of the given date in local time
  const baseDate = formattedDate
    ? new Date(`${formattedDate}T00:00:00`)
    : new Date();

  const data = [];
  for (let i = 0; i < 96; i++) {
    const d = new Date(baseDate.getTime() + i * 15 * 60 * 1000);

    // Smooth-ish demo curve for energy
    const hour = d.getHours() + d.getMinutes() / 60;
    const kvaBase = 80 + 40 * Math.sin((Math.PI * hour) / 12); // pseudo daily pattern
    const kwBase = kvaBase * 0.85;

    data.push({
      timestamp: d.toISOString(),
      energies: {
        kvaImport: kvaBase,
        kwImport: kwBase,
      },
      voltage: {
        r: 230 + (Math.sin(hour) * 5),
        y: 231 + (Math.cos(hour) * 5),
        b: 229 + (Math.sin(hour + 1) * 5),
      },
      current: {
        r: 60 + (Math.sin(hour / 2) * 5),
        y: 58 + (Math.cos(hour / 2) * 5),
        b: 59 + (Math.sin(hour / 2 + 1) * 5),
      },
    });
  }

  const metaMeterId = meterId || "DEMO-METER-001";

  return {
    data,
    metadata: {
      meterId: metaMeterId,
      meterSerialNumber: metaMeterId,
      totalRecords: data.length,
      dataInterval: "15min",
      date: formattedDate,
      consumerIdentifier: identifier,
    },
  };
};

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

// --------- NOTIFICATIONS DEMO DATA ----------

// Generate demo notifications for a consumer
export const getDemoNotifications = (identifier) => {
  const now = new Date();
  
  // Generate timestamps for different times (some recent, some older)
  const timestamps = [
    new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
    new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
  ];

  const dashboardData = getDemoDashboardConsumerData(identifier);
  const core = getDemoConsumerCore(identifier);

  return [
    {
      id: `DEMO-NOTIF-001-${identifier}`,
      title: "Payment Successful",
      message: `Your payment of ₹${core.totalOutstanding.toFixed(2)} has been successfully processed.`,
      type: "payment",
      is_read: false,
      created_at: timestamps[0].toISOString(),
      meta: {
        sentAt: timestamps[0].toISOString(),
      },
      redirect_url: "/invoices",
    },
    {
      id: `DEMO-NOTIF-002-${identifier}`,
      title: "Bill Due Reminder",
      message: `Your bill of ₹${core.totalOutstanding.toFixed(2)} is due on ${new Date(dashboardData.dueDate || new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}. Please pay to avoid late fees.`,
      type: "due",
      is_read: false,
      created_at: timestamps[1].toISOString(),
      meta: {
        sentAt: timestamps[1].toISOString(),
      },
      redirect_url: "/invoices",
    },
    {
      id: `DEMO-NOTIF-003-${identifier}`,
      title: "Meter Reading Alert",
      message: `Unusual consumption pattern detected for meter ${core.meterSerialNumber}. Please verify your usage.`,
      type: "alert",
      is_read: true,
      created_at: timestamps[2].toISOString(),
      meta: {
        sentAt: timestamps[2].toISOString(),
      },
      redirect_url: "/usage",
    },
    {
      id: `DEMO-NOTIF-004-${identifier}`,
      title: "Voltage Fluctuation Warning",
      message: "Voltage imbalance detected in your connection. Our team has been notified.",
      type: "warning",
      is_read: false,
      created_at: timestamps[3].toISOString(),
      meta: {
        sentAt: timestamps[3].toISOString(),
      },
      redirect_url: "/dashboard",
    },
    {
      id: `DEMO-NOTIF-005-${identifier}`,
      title: "New Invoice Generated",
      message: `Invoice INV-2401 for ₹48,230.50 has been generated. View details in the Invoices section.`,
      type: "info",
      is_read: true,
      created_at: timestamps[4].toISOString(),
      meta: {
        sentAt: timestamps[4].toISOString(),
      },
      redirect_url: "/invoices",
    },
    {
      id: `DEMO-NOTIF-006-${identifier}`,
      title: "Account Balance Updated",
      message: `Your account balance has been updated. Outstanding amount: ₹${core.totalOutstanding.toFixed(2)}.`,
      type: "balance",
      is_read: true,
      created_at: timestamps[5].toISOString(),
      meta: {
        sentAt: timestamps[5].toISOString(),
      },
      redirect_url: "/dashboard",
    },
    {
      id: `DEMO-NOTIF-007-${identifier}`,
      title: "Maintenance Scheduled",
      message: "Scheduled maintenance for your area on Jan 20, 2026 from 10:00 AM to 2:00 PM. Power may be interrupted.",
      type: "info",
      is_read: true,
      created_at: timestamps[6].toISOString(),
      meta: {
        sentAt: timestamps[6].toISOString(),
      },
      redirect_url: null,
    },
    {
      id: `DEMO-NOTIF-008-${identifier}`,
      title: "Payment Receipt",
      message: `Payment receipt for ₹51,210.75 has been generated. You can download it from the Invoices section.`,
      type: "success",
      is_read: true,
      created_at: timestamps[7].toISOString(),
      meta: {
        sentAt: timestamps[7].toISOString(),
      },
      redirect_url: "/invoices",
    },
  ];
};