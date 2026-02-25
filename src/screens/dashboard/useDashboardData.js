import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { InteractionManager } from "react-native";
import { formatFrontendDateTime } from "../../utils/dateUtils";
import { apiClient } from "../../services/apiClient";
import { getUser } from "../../utils/storage";

const FALLBACK_ALERT_ROWS = [
  { id: 1, meterSerialNumber: "24021286", consumerName: "Safran MRO", eventDateTime: "Nov 26, 2025, 8:42 AM", eventDescription: "R_PH CT Open", status: "Resolved", duration: "0h 4m" },
  { id: 2, meterSerialNumber: "24021286", consumerName: "Safran MRO", eventDateTime: "Nov 26, 2025, 8:42 AM", eventDescription: "B_PH CT Open", status: "Resolved", duration: "0h 4m" },
  { id: 3, meterSerialNumber: "18132429", consumerName: "GMR AERO TOWER 2 INCOMER", eventDateTime: "Nov 26, 2025, 12:36 AM", eventDescription: "R_PH CT Open", status: "Active", duration: "1d 9h 40m" },
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Pure helpers (no hooks) ────────────────────────────────────────────────

function decumulateData(data) {
  const isCumulative = data.every((v, i) => i === 0 || v >= data[i - 1]);
  if (!isCumulative) return data;
  return data.map((v, i) => (i === 0 ? v || 0 : (v || 0) - (data[i - 1] || 0)));
}

function parseDailyLabel(label) {
  if (!label || typeof label !== "string") return null;
  const d = new Date(label);
  if (!isNaN(d.getTime())) return d;
  const m = String(label).trim().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (m) {
    const monthIdx = MONTH_NAMES.findIndex((mn) => mn.toLowerCase() === m[2].substring(0, 3).toLowerCase());
    if (monthIdx !== -1) return new Date(parseInt(m[3], 10), monthIdx, parseInt(m[1], 10));
  }
  const m2 = String(label).trim().match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m2) return new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10));
  return null;
}

function deriveMonthlySeries(chartData) {
  if (!chartData?.daily?.seriesData?.[0]?.data?.length || !chartData.daily.xAxisData?.length) return null;
  if (chartData.monthly?.seriesData?.[0]?.data?.length) return null;

  const dailyData = chartData.daily.seriesData[0].data;
  const dailyLabels = chartData.daily.xAxisData;
  const dailyConsumptions = decumulateData(dailyData);

  const monthMap = {};
  for (let i = 0; i < dailyLabels.length; i++) {
    const d = parseDailyLabel(dailyLabels[i]);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap[key]) monthMap[key] = { sum: 0, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` };
    monthMap[key].sum += dailyConsumptions[i] || 0;
  }
  const sortedKeys = Object.keys(monthMap).sort();
  let run = 0;
  return {
    seriesData: [{ data: sortedKeys.map((k) => { run += monthMap[k].sum; return run; }) }],
    xAxisData: sortedKeys.map((k) => monthMap[k].label),
  };
}

function trendPercentage(data) {
  if (!data?.length || data.length < 2) return 0;
  const consumptions = decumulateData(data);
  const curr = consumptions[consumptions.length - 1] || 0;
  const prev = consumptions[consumptions.length - 2] || 0;
  if (prev === 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

// ─── Formatters ─────────────────────────────────────────────────────────────

export function formatAmount(amount) {
  if (amount === null || amount === undefined) return "₹0.00";
  return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatReadingDate(dateString) {
  if (!dateString) return "Loading...";
  try {
    const str = String(dateString).trim();
    const match = str.match(/^(\d+)(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
    if (match) {
      const [, dayNum, monthStr, year, hour, min] = match;
      const monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthStr.toLowerCase());
      if (monthIndex === -1) return dateString;
      const hourNum = parseInt(hour, 10);
      const minNum = parseInt(min, 10);
      const isPm = (match[7] || "AM").toUpperCase() === "PM";
      const hour24 = (hourNum % 12) + (isPm ? 12 : 0);
      const d = new Date(parseInt(year, 10), monthIndex, parseInt(dayNum, 10), hour24, minNum);
      return formatFrontendDateTime(d) || dateString;
    }
    const normalized = str.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return formatFrontendDateTime(d);
    return dateString;
  } catch {
    return dateString;
  }
}

// ─── Tamper / alert helpers ─────────────────────────────────────────────────

const TAMPER_TYPES = {
  1: "Cover Tamper", 2: "Magnetic Tamper", 3: "Reverse Current", 4: "Neutral Disconnect",
  5: "Phase Disconnect", 6: "Neutral Reverse", 7: "Phase Reverse", 8: "Current Imbalance",
  9: "Voltage Imbalance", 10: "Power Factor", 11: "Frequency", 12: "CT Bypass",
  13: "CT Open", 14: "PT Bypass", 15: "PT Open", 24: "Tamper Type 24", 25: "Tamper Type 25",
};

const TAMPER_DESCRIPTIONS = {
  1: "Meter cover has been removed or tampered with", 2: "Magnetic interference detected on meter",
  3: "Current flow direction reversed from normal", 4: "Neutral wire disconnected from meter",
  5: "Phase wire disconnected from meter", 6: "Neutral wire connected in reverse polarity",
  7: "Phase wire connected in reverse polarity", 8: "Uneven current distribution across phases",
  9: "Uneven voltage distribution across phases", 10: "Power factor outside acceptable range",
  11: "Frequency deviation from standard 50Hz", 12: "Current transformer bypassed",
  13: "Current transformer circuit opened", 14: "Potential transformer bypassed",
  15: "Potential transformer circuit opened",
  24: "Custom tamper detection type 24 - specific to your meter system",
  25: "Custom tamper detection type 25 - specific to your meter system",
};

function formatDuration(val) {
  if (typeof val === "string" && val.trim().length > 0) return val.replace(/\s*\d+\s*s\s*/gi, "").trim() || val.trim();
  if (typeof val === "number" && val >= 0) return `${Math.floor(val / 60)}h ${val % 60}m`;
  if (val && typeof val === "object") return `${val.hours ?? 0}h ${val.minutes ?? val.mins ?? 0}m`;
  return "--";
}

function formatStatus(s) {
  if (!s) return "Active";
  const n = `${s}`.trim().toLowerCase();
  if (n.includes("resolve")) return "Resolved";
  if (n.includes("active")) return "Active";
  return `${s}`.charAt(0).toUpperCase() + `${s}`.slice(1);
}

function mapTamperEvents(rawData, consumerData) {
  if (!Array.isArray(rawData)) return [];
  const fallbackName = consumerData?.name || "--";
  const fallbackMeter = consumerData?.meterSerialNumber || consumerData?.meterNumber || "--";
  return rawData.map((event, index) => ({
    id: event?.id || event?.eventId || `tamper-event-${index}`,
    meterSerialNumber: event?.meterSerialNumber || event?.meterNumber || event?.meterSlNo || fallbackMeter,
    consumerName: event?.consumerName || event?.consumer?.name || fallbackName,
    eventDateTime: (event?.tamperDatetime || event?.occurredOn || event?.eventDateTime || event?.eventTimestamp)
      ? (formatFrontendDateTime(event?.tamperDatetime || event?.occurredOn || event?.eventDateTime || event?.eventTimestamp) || (event?.tamperDatetime || event?.occurredOn || event?.eventDateTime || event?.eventTimestamp))
      : "--",
    eventDescription: event?.eventDescription || event?.tamperTypeDesc || TAMPER_DESCRIPTIONS[event?.tamperType] || TAMPER_TYPES[event?.tamperType] || "--",
    status: formatStatus(event?.status || event?.eventStatus || (event?.tamperStatus === 1 ? "Active" : "Resolved")),
    duration: formatDuration(event?.duration || event?.durationMinutes || event?.durationInMinutes || event?.durationInMins || event?.durationSeconds || event?.durationText),
    raw: event,
  }));
}

// ─── Report normalizer ──────────────────────────────────────────────────────

function normalizeReportToChartData(response) {
  if (!response) return null;
  const raw = response.data ?? response;
  if (!raw) return null;

  const formatLabel = (d) => {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return `${String(parsed.getDate()).padStart(2, "0")} ${MONTH_NAMES[parsed.getMonth()]} ${parsed.getFullYear()}`;
    return String(d);
  };

  if (Array.isArray(raw.consumption) && raw.consumption.length > 0) {
    const items = raw.consumption;
    const dates = [], values = [];
    for (const item of items) {
      if (item && typeof item === "object") {
        const dateVal = item.date ?? item.dateTime ?? item.day ?? item.label;
        const numVal = Number(item.consumption ?? item.value ?? item.kwh ?? item.usage ?? 0) || 0;
        if (dateVal != null) { dates.push(dateVal); values.push(numVal); }
      }
    }
    if (dates.length > 0) return { chartData: { daily: { seriesData: [{ data: values }], xAxisData: dates.map(formatLabel) } } };
    if (raw.dateRange?.startDate && raw.dateRange?.endDate) {
      const start = new Date(raw.dateRange.startDate);
      const vals = items.map((v) => (typeof v === "object" ? Number(v?.consumption ?? v?.value ?? v?.kwh ?? 0) || 0 : Number(v) || 0));
      const xAxisData = [];
      const d = new Date(start);
      for (let i = 0; i < vals.length; i++) { xAxisData.push(formatLabel(d)); d.setDate(d.getDate() + 1); }
      return { chartData: { daily: { seriesData: [{ data: vals }], xAxisData } } };
    }
  }
  if (Array.isArray(raw.data)) {
    const dates = raw.data.map((r) => r.date || r.dateTime || r.day);
    const values = raw.data.map((r) => Number(r.consumption ?? r.value ?? r.kwh ?? 0) || 0);
    return { chartData: { daily: { seriesData: [{ data: values }], xAxisData: dates.map(formatLabel) } } };
  }
  if (Array.isArray(raw.dates) && Array.isArray(raw.consumption)) {
    const values = raw.consumption.map((v) => Number(v) || 0);
    return { chartData: { daily: { seriesData: [{ data: values }], xAxisData: raw.dates.map(formatLabel) } } };
  }
  if (raw.chartData?.daily?.seriesData?.[0]?.data && raw.chartData.daily.xAxisData) return { chartData: raw.chartData };
  if (raw.seriesData?.[0]?.data && raw.xAxisData) return { chartData: { daily: { seriesData: raw.seriesData, xAxisData: raw.xAxisData } } };
  return null;
}

// ─── Date-range report fetcher ──────────────────────────────────────────────

function toYYYYMMDD(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── parseDateFromBarLabel ──────────────────────────────────────────────────

export function parseDateFromBarLabel(label, viewType) {
  if (!label) return null;
  try {
    let date;
    const currentYear = new Date().getFullYear();

    if (viewType === "daily") {
      date = new Date(label);
      if (isNaN(date.getTime())) {
        const m = label.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i);
        if (m) { date = new Date(parseInt(m[3]), new Date(`${m[2]} 1, ${m[3]}`).getMonth(), parseInt(m[1])); }
      }
      if (isNaN(date.getTime())) {
        const m = label.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/i);
        if (m) {
          const mi = MONTH_NAMES.findIndex((mn) => mn.toLowerCase() === m[2].substring(0, 3).toLowerCase());
          if (mi !== -1) date = new Date(currentYear, mi, parseInt(m[1]));
        }
      }
      if (isNaN(date.getTime())) {
        const m = label.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
        if (m) date = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
      }
      if (isNaN(date.getTime())) {
        const m = label.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
        if (m) date = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
      }
      if (isNaN(date.getTime())) date = new Date();
    } else {
      const mi = MONTH_NAMES.findIndex((mn) => mn.toLowerCase() === label.substring(0, 3).toLowerCase());
      date = mi !== -1 ? new Date(currentYear, mi, 1) : new Date(new Date().setDate(1));
    }

    if (isNaN(date.getTime())) date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  } catch {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  }
}

// ─── The hook ───────────────────────────────────────────────────────────────

export default function useDashboardData(consumerData, { pickedDateRange, timePeriod }) {
  // ── Picked-range report state ──
  const [pickedRangeReportData, setPickedRangeReportData] = useState(null);
  const [pickedRangeReportLoading, setPickedRangeReportLoading] = useState(false);

  // ── Alert table state ──
  const [tableData, setTableData] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

  // Fetch report when user picks a date range
  useEffect(() => {
    if (!pickedDateRange?.startDate || !pickedDateRange?.endDate) { setPickedRangeReportData(null); return; }
    const startStr = toYYYYMMDD(pickedDateRange.startDate);
    const endStr = toYYYYMMDD(pickedDateRange.endDate);
    if (!startStr || !endStr) return;

    let cancelled = false;
    (async () => {
      const user = await getUser();
      const identifier = consumerData?.uniqueIdentificationNo || consumerData?.consumerNumber || consumerData?.consumerId || user?.identifier;
      if (!identifier) return;
      setPickedRangeReportLoading(true);
      setPickedRangeReportData(null);
      try {
        const result = await apiClient.getConsumerReport(identifier, startStr, endStr, "daily-consumption");
        if (!cancelled && result?.success && result?.data) {
          const normalized = normalizeReportToChartData(result.data);
          if (normalized) setPickedRangeReportData(normalized);
        }
      } catch (e) {
        if (!cancelled && __DEV__) console.warn("useDashboardData: report fetch failed", e);
      } finally {
        if (!cancelled) setPickedRangeReportLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pickedDateRange, consumerData?.uniqueIdentificationNo, consumerData?.consumerNumber, consumerData?.consumerId]);

  // ── Effective chart data (deferred: first paint uses raw data, monthly derivation runs after interactions settle) ──
  const baseChartData = useMemo(() => {
    if (pickedDateRange && pickedRangeReportData?.chartData) {
      return { ...consumerData, chartData: pickedRangeReportData.chartData };
    }
    return consumerData;
  }, [consumerData, pickedDateRange, pickedRangeReportData]);

  const [derivedMonthly, setDerivedMonthly] = useState(null);
  const derivationKeyRef = useRef(null);

  useEffect(() => {
    const chartData = baseChartData?.chartData;
    const key = JSON.stringify(chartData?.daily?.xAxisData?.slice(-3));
    if (key === derivationKeyRef.current) return;

    if (!chartData) { setDerivedMonthly(null); derivationKeyRef.current = key; return; }

    const handle = InteractionManager.runAfterInteractions(() => {
      const monthly = deriveMonthlySeries(chartData);
      derivationKeyRef.current = key;
      setDerivedMonthly(monthly);
    });
    return () => handle.cancel();
  }, [baseChartData]);

  const effectiveDataForChart = useMemo(() => {
    if (!baseChartData?.chartData) return baseChartData;
    if (!derivedMonthly) return baseChartData;
    return { ...baseChartData, chartData: { ...baseChartData.chartData, monthly: derivedMonthly } };
  }, [baseChartData, derivedMonthly]);

  // ── Alert table loading ──
  useEffect(() => {
    if (!consumerData) return;
    setIsTableLoading(true);
    try {
      if (consumerData.alerts?.length) {
        const sorted = [...consumerData.alerts].sort((a, b) => new Date(b.tamperDatetime) - new Date(a.tamperDatetime));
        setTableData(mapTamperEvents(sorted, consumerData));
      } else {
        setTableData(FALLBACK_ALERT_ROWS);
      }
    } catch {
      setTableData(FALLBACK_ALERT_ROWS);
    } finally {
      setIsTableLoading(false);
    }
  }, [consumerData]);

  // ── Summary stats ──
  const averageDailyKwh = useMemo(() => {
    if (!consumerData) return 0;
    return consumerData.monthlyAverage ?? consumerData.dashboardStats?.averageDailyKwh ?? consumerData.averageDaily ?? 0;
  }, [consumerData]);

  const peakUsageKwh = useMemo(() => {
    if (!consumerData) return 0;
    return consumerData.peakUsage?.consumption ?? consumerData.dashboardStats?.peakUsageKwh ?? (typeof consumerData.peakUsage === "number" ? consumerData.peakUsage : 0);
  }, [consumerData]);

  const chartMonthlyComparison = useMemo(() => {
    const data = consumerData?.chartData?.monthly?.seriesData?.[0]?.data;
    if (!data?.length) return null;
    const consumptions = decumulateData(data);
    return {
      thisMonth: consumptions[consumptions.length - 1] ?? null,
      lastMonth: consumptions.length >= 2 ? consumptions[consumptions.length - 2] ?? null : null,
    };
  }, [consumerData]);

  const thisMonthKwh = useMemo(() => {
    if (!consumerData) return 0;
    return chartMonthlyComparison?.thisMonth ?? consumerData.dashboardStats?.thisMonthKwh ?? consumerData.thisMonthKwh ?? 0;
  }, [consumerData, chartMonthlyComparison]);

  const lastMonthKwh = useMemo(() => {
    if (!consumerData) return 0;
    return chartMonthlyComparison?.lastMonth ?? consumerData.dashboardStats?.lastMonthKwh ?? consumerData.lastMonthKwh ?? 0;
  }, [consumerData, chartMonthlyComparison]);

  const savingsKwh = useMemo(() => {
    if (consumerData?.dashboardStats?.savingsKwh != null) return consumerData.dashboardStats.savingsKwh;
    if (typeof consumerData?.savingsKwh === "number") return consumerData.savingsKwh;
    const diff = lastMonthKwh - thisMonthKwh;
    return diff > 0 ? diff : 0;
  }, [consumerData, lastMonthKwh, thisMonthKwh]);

  const comparisonDiffKwh = useMemo(() => thisMonthKwh - lastMonthKwh, [thisMonthKwh, lastMonthKwh]);

  const comparisonBarFillPercent = useMemo(() => {
    const total = thisMonthKwh + lastMonthKwh;
    return total <= 0 ? 50 : (thisMonthKwh / total) * 100;
  }, [thisMonthKwh, lastMonthKwh]);

  // ── Usage + trend helpers (stable references via useCallback) ──
  const getUsageForTimePeriod = useCallback(() => {
    const key = timePeriod === "7D" ? "daily" : "monthly";
    const data = consumerData?.chartData?.[key]?.seriesData?.[0]?.data;
    return data?.length ? data[data.length - 1] || 0 : 0;
  }, [consumerData, timePeriod]);

  const getTrendPercentageForTimePeriod = useCallback(() => {
    const key = timePeriod === "7D" ? "daily" : "monthly";
    const data = consumerData?.chartData?.[key]?.seriesData?.[0]?.data;
    return data ? trendPercentage(data) : 0;
  }, [consumerData, timePeriod]);

  // ── Effective view for table (90D/1Y → monthly, else daily) ──
  const effectiveViewForTable = timePeriod === "90D" || timePeriod === "1Y" ? "monthly" : "daily";

  // ── Consumption table data ──
  const consumptionTableData = useMemo(() => {
    const dataSource = effectiveDataForChart ?? consumerData;
    if (!dataSource?.chartData) return [];
    const isDaily = effectiveViewForTable === "daily";
    const chartType = isDaily ? dataSource.chartData.daily : dataSource.chartData.monthly;
    if (!chartType?.seriesData?.[0]?.data || !chartType?.xAxisData) return [];

    const data = chartType.seriesData[0].data;
    const labels = chartType.xAxisData;
    const consumptions = decumulateData(data);

    let visibleData, visibleConsumptions, visibleLabels, startIndex;

    if (pickedDateRange?.startDate && pickedDateRange?.endDate) {
      const rangeStart = new Date(pickedDateRange.startDate.getFullYear(), pickedDateRange.startDate.getMonth(), pickedDateRange.startDate.getDate());
      const rangeEnd = new Date(pickedDateRange.endDate.getFullYear(), pickedDateRange.endDate.getMonth(), pickedDateRange.endDate.getDate());
      const indices = [];
      for (let i = 0; i < labels.length; i++) {
        const ld = isDaily ? parseDailyLabel(labels[i]) : (() => { const m = labels[i]?.match(/(\w+)\s+(\d{4})/i); if (!m) return null; const mi = MONTH_NAMES.findIndex((x) => x.toLowerCase() === m[1].substring(0,3).toLowerCase()); return mi !== -1 ? new Date(parseInt(m[2]), mi, 1) : null; })();
        if (!ld) continue;
        const dayStart = new Date(ld.getFullYear(), ld.getMonth(), ld.getDate());
        if (isDaily) {
          if (dayStart >= rangeStart && dayStart <= rangeEnd) indices.push(i);
        } else {
          const monthEnd = new Date(ld.getFullYear(), ld.getMonth() + 1, 0);
          if (dayStart <= rangeEnd && monthEnd >= rangeStart) indices.push(i);
        }
      }
      if (indices.length > 0) {
        visibleData = indices.map((i) => data[i] ?? 0);
        visibleConsumptions = indices.map((i) => consumptions[i] ?? 0);
        visibleLabels = indices.map((i) => labels[i]);
        startIndex = indices[0];
      }
    }

    if (!visibleLabels) {
      let sliceCount;
      if (isDaily) sliceCount = timePeriod === "7D" ? 7 : timePeriod === "30D" ? 30 : data.length;
      else sliceCount = timePeriod === "1Y" ? 12 : timePeriod === "90D" ? 3 : data.length;
      startIndex = Math.max(0, data.length - sliceCount);
      visibleData = data.slice(startIndex);
      visibleConsumptions = consumptions.slice(startIndex);
      visibleLabels = labels.slice(startIndex);
    }

    return visibleLabels.map((label, index) => ({
      id: (startIndex || 0) + index + 1,
      period: label,
      consumption: visibleConsumptions[index] || 0,
      cumulative: visibleData[index] || 0,
    })).reverse();
  }, [consumerData, effectiveDataForChart, effectiveViewForTable, timePeriod, pickedDateRange]);

  return {
    pickedRangeReportData, setPickedRangeReportData,
    pickedRangeReportLoading,
    effectiveDataForChart,
    effectiveViewForTable,
    consumptionTableData,
    tableData, isTableLoading,
    averageDailyKwh, peakUsageKwh,
    thisMonthKwh, lastMonthKwh, savingsKwh,
    comparisonDiffKwh, comparisonBarFillPercent,
    getUsageForTimePeriod, getTrendPercentageForTimePeriod,
  };
}
