import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Modal,
  Pressable,
} from "react-native";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS, colors } from "../constants/colors";
import Arrow from "../../assets/icons/arrow.svg";
import GroupedBarChart from "../components/GroupedBarChart";
import ConsumerGroupedBarChart from "../components/ConsumerGroupedBarChart";
import Table from "../components/global/Table";
import Input from "../components/global/Input";
import Meter from "../../assets/icons/meterWhite.svg";
import GlobeShield from "../../assets/icons/globe-shield.svg";
import DashboardHeader from "../components/global/DashboardHeader";
import BottomNavigation from "../components/global/BottomNavigation";
import LastCommunicationIcon from "../../assets/icons/signal.svg";
import EyeIcon from "../../assets/icons/eyeFill.svg";
import { API, API_ENDPOINTS } from "../constants/constants";
import { getUser, getToken } from "../utils/storage";
import { useTheme } from "../context/ThemeContext";
import { useFocusEffect } from "@react-navigation/native";
import ConsumerDetailsBottomSheet from "../components/ConsumerDetailsBottomSheet";
import { useLoading, SkeletonLoader } from '../utils/loadingManager';
import { apiClient } from '../services/apiClient';
import { isDemoUser, getDemoDashboardConsumerData } from "../constants/demoData";
import ComparisonIconBlack from "../../assets/icons/comparisonBlack.svg";
import ComparisonIconWhite from "../../assets/icons/comparisonWhite.svg";
import DropdownIcon from "../../assets/icons/dropDown.svg";
import CalendarIcon from "../../assets/icons/CalendarBlue.svg";
import PiggybankIcon from "../../assets/icons/piggybank.svg";
import CalendarDatePicker from "../components/global/CalendarDatePicker";
import { formatFrontendDateTime, formatFrontendDate, formatDueDateDisplay } from "../utils/dateUtils";

const FALLBACK_ALERT_ROWS = [
  {
    id: 1,
    meterSerialNumber: "24021286",
    consumerName: "Safran MRO",
    eventDateTime: "Nov 26, 2025, 8:42 AM",
    eventDescription: "R_PH CT Open",
    status: "Resolved",
    duration: "0h 4m",
  },
  {
    id: 2,
    meterSerialNumber: "24021286",
    consumerName: "Safran MRO",
    eventDateTime: "Nov 26, 2025, 8:42 AM",
    eventDescription: "B_PH CT Open",
    status: "Resolved",
    duration: "0h 4m",
  },
  {
    id: 3,
    meterSerialNumber: "18132429",
    consumerName: "GMR AERO TOWER 2 INCOMER",
    eventDateTime: "Nov 26, 2025, 12:36 AM",
    eventDescription: "R_PH CT Open",
    status: "Active",
    duration: "1d 9h 40m",
  }
];

const useBlinkingOpacity = () => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return opacity;
};

const StatusBlinkingDot = ({ status }) => {
  const opacity = useBlinkingOpacity();
  const normalized = `${status}`.toLowerCase();
  const isResolved = normalized.includes("resolve");
  const color = isResolved ? "#2ECC71" : "#FF4D4F";

  return (
    <Animated.View
      style={[
        styles.statusBlinkDot,
        { backgroundColor: color, opacity }
      ]}
    />
  );
};

// import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Dynamic API URL will be set based on authenticated user

const VIEW_OPTIONS = ["Chart", "Table"];
const TIME_PERIODS = ["7D", "30D", "90D", "1Y"];

const USAGE_CARD_LABELS = {
  "7D": { title: "This Week's Usage:", comparisonLabel: "vs. Last Week." },
  "30D": { title: "This Month's Usage:", comparisonLabel: "vs. Last Month." },
  "90D": { title: "This Quarter's Usage:", comparisonLabel: "vs. Last Quarter." },
  "1Y": { title: "This Year's Usage:", comparisonLabel: "vs. Last Year." },
};

const PostPaidDashboard = ({ navigation, route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const [selectedView] = useState("daily"); // Always daily; date is chosen via Pick a Date
  const [pickedDateRange, setPickedDateRange] = useState(null); // { startDate, endDate } or null
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [displayMode, setDisplayMode] = useState("chart"); // "chart" or "table"
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [dropdownButtonLayout, setDropdownButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const viewDropdownRef = useRef(null);
  const [timePeriod, setTimePeriod] = useState("7D");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tableData, setTableData] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [consumerData, setConsumerData] = useState(null);
  const { isLoading, setLoading } = useLoading('consumerData', true);

  // Report API data when user picks a date range (consumers/.../report?reportType=daily-consumption)
  const [pickedRangeReportData, setPickedRangeReportData] = useState(null);
  const [pickedRangeReportLoading, setPickedRangeReportLoading] = useState(false);

  // Bottom sheet state
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedConsumerUid, setSelectedConsumerUid] = useState(null);

  // Reset picked date to default "Pick a Date" when screen loads or gains focus (e.g. after reload or tab switch)
  useFocusEffect(
    useCallback(() => {
      setPickedDateRange(null);
      setPickedRangeReportData(null);
    }, [])
  );

  // Fetch API data (or demo data if using demo credentials)
  const fetchConsumerData = useCallback(async () => {
    try {
      setLoading(true);

      // Get authenticated user data
      const user = await getUser();

      if (!user || !user.identifier) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
      }

      // DEMO MODE: if logged in with demo credentials, use local demo data
      if (isDemoUser(user.identifier)) {
        const demoData = getDemoDashboardConsumerData(user.identifier);
        setConsumerData(demoData);
        console.log("📊 Using demo dashboard data for:", user.identifier);
        setLoading(false);
        return;
      }

      console.log("🔄 Fetching consumer data for:", user.identifier);

      // Use the centralized API client
      const result = await apiClient.getConsumerData(user.identifier);

      if (result.success) {
        setConsumerData(result.data);
        console.log("📊 Consumer Data Set:", result.data);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("❌ API error:", error);
        
        // Provide specific error messages based on error type
        let errorMessage = "Failed to load Data";
        if (error.message.includes('HTTP 500')) {
          errorMessage = "Server error - please try again later";
        } else if (error.message.includes('HTTP 401') || error.message.includes('Authentication failed')) {
          errorMessage = "Authentication failed - please login again";
        } else if (error.message.includes('HTTP 403') || error.message.includes('Access denied')) {
          errorMessage = "Access denied - contact support";
        } else if (error.message.includes('HTTP 404') || error.message.includes('not found')) {
          errorMessage = "Consumer data not found";
        } else if (error.message.includes('timeout') || error.message.includes('Request timeout')) {
          errorMessage = "Request is taking longer than expected. The server may be slow. Please try again.";
        } else if (error.message.includes('Network error')) {
          errorMessage = "Network error - please check your connection";
        }
        
        console.log("❌ Error:", errorMessage);
        
        // Set fallback data with user's actual identifier
        const user = await getUser();
        const fallbackData = {
          name: user?.name || "Consumer",
          meterSerialNumber: user?.meterSerialNumber || "N/A",
          uniqueIdentificationNo: user?.identifier || user?.consumerNumber || "N/A",
          readingDate: new Date().toLocaleString(),
          totalOutstanding: 0,
          dailyConsumption: 0,
          monthlyConsumption: 0
        };
        
        setConsumerData(fallbackData);
      } finally {
        setLoading(false);
      }
  }, [setLoading]);

  useEffect(() => {
    fetchConsumerData();
  }, [fetchConsumerData]);

  // Format Date to YYYY-MM-DD for report API
  const toYYYYMMDD = useCallback((d) => {
    if (!d || !(d instanceof Date) || isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  // Normalize report API response to chartData.daily shape (seriesData[0].data, xAxisData)
  const normalizeReportToChartData = useCallback((response) => {
    if (!response) return null;
    const raw = response.data ?? response;
    if (!raw) return null;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const formatLabel = (d) => {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        return `${String(parsed.getDate()).padStart(2, "0")} ${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
      }
      return String(d);
    };

    // Shape: API returns { consumption: [ { date, consumption } ], dateRange: { startDate, endDate } }
    if (Array.isArray(raw.consumption) && raw.consumption.length > 0) {
      const items = raw.consumption;
      const dates = [];
      const values = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && typeof item === "object") {
          const dateVal = item.date ?? item.dateTime ?? item.day ?? item.label;
          const numVal = Number(item.consumption ?? item.value ?? item.kwh ?? item.usage ?? 0) || 0;
          if (dateVal != null) {
            dates.push(dateVal);
            values.push(numVal);
          }
        }
      }
      if (dates.length > 0) {
        const xAxisData = dates.map(formatLabel);
        return {
          chartData: {
            daily: {
              seriesData: [{ data: values }],
              xAxisData,
            },
          },
        };
      }
      // Fallback: consumption is array of numbers, use dateRange to build labels
      if (raw.dateRange?.startDate && raw.dateRange?.endDate) {
        const start = new Date(raw.dateRange.startDate);
        const end = new Date(raw.dateRange.endDate);
        const values = items.map((v) => (typeof v === "object" ? Number(v?.consumption ?? v?.value ?? v?.kwh ?? 0) || 0 : Number(v) || 0));
        const xAxisData = [];
        const d = new Date(start);
        for (let i = 0; i < values.length; i++) {
          xAxisData.push(formatLabel(d));
          d.setDate(d.getDate() + 1);
        }
        return {
          chartData: {
            daily: {
              seriesData: [{ data: values }],
              xAxisData,
            },
          },
        };
      }
    }

    // Shape 1: { data: [ { date, consumption } ] }
    if (Array.isArray(raw.data)) {
      const dates = raw.data.map((r) => r.date || r.dateTime || r.day);
      const values = raw.data.map((r) => Number(r.consumption ?? r.value ?? r.kwh ?? 0) || 0);
      const xAxisData = dates.map((d) => {
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          return `${String(parsed.getDate()).padStart(2, "0")} ${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
        }
        return String(d);
      });
      return {
        chartData: {
          daily: {
            seriesData: [{ data: values }],
            xAxisData,
          },
        },
      };
    }
    // Shape 2: { dates: [], consumption: [] } (consumption as array of numbers)
    if (Array.isArray(raw.dates) && Array.isArray(raw.consumption)) {
      const xAxisData = raw.dates.map((d) => {
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
          return `${String(parsed.getDate()).padStart(2, "0")} ${monthNames[parsed.getMonth()]} ${parsed.getFullYear()}`;
        }
        return String(d);
      });
      const values = raw.consumption.map((v) => Number(v) || 0);
      return {
        chartData: {
          daily: {
            seriesData: [{ data: values }],
            xAxisData,
          },
        },
      };
    }
    // Shape 3: already chart-like { chartData: { daily: { seriesData, xAxisData } } } or { xAxisData, seriesData }
    if (raw.chartData?.daily?.seriesData?.[0]?.data && raw.chartData.daily.xAxisData) {
      return { chartData: raw.chartData };
    }
    if (raw.seriesData?.[0]?.data && raw.xAxisData) {
      return {
        chartData: {
          daily: {
            seriesData: raw.seriesData,
            xAxisData: raw.xAxisData,
          },
        },
      };
    }
    return null;
  }, []);

  // When user picks a date range, fetch daily-consumption report and use it for the bar chart
  useEffect(() => {
    if (!pickedDateRange?.startDate || !pickedDateRange?.endDate) {
      setPickedRangeReportData(null);
      return;
    }
    const startStr = toYYYYMMDD(pickedDateRange.startDate);
    const endStr = toYYYYMMDD(pickedDateRange.endDate);
    if (!startStr || !endStr) return;

    let cancelled = false;
    const fetchReport = async () => {
      const user = await getUser();
      const identifier =
        consumerData?.uniqueIdentificationNo ||
        consumerData?.consumerNumber ||
        consumerData?.consumerId ||
        user?.identifier;
      if (!identifier) {
        if (__DEV__) console.log("PostPaidDashboard: No consumer identifier for report");
        return;
      }
      setPickedRangeReportLoading(true);
      setPickedRangeReportData(null);
      try {
        const result = await apiClient.getConsumerReport(
          identifier,
          startStr,
          endStr,
          "daily-consumption"
        );
        if (cancelled) return;
        if (result?.success && result?.data) {
          const normalized = normalizeReportToChartData(result.data);
          if (normalized) setPickedRangeReportData(normalized);
        }
      } catch (e) {
        if (!cancelled && __DEV__) console.warn("PostPaidDashboard: report fetch failed", e);
      } finally {
        if (!cancelled) setPickedRangeReportLoading(false);
      }
    };
    fetchReport();
    return () => { cancelled = true; };
  }, [pickedDateRange, toYYYYMMDD, normalizeReportToChartData, consumerData?.uniqueIdentificationNo, consumerData?.consumerNumber, consumerData?.consumerId]);

  // When a date range is picked and report is loaded, use report data for chart/table; otherwise use main consumer data
  const effectiveDataForChartBase = useMemo(() => {
    if (pickedDateRange && pickedRangeReportData?.chartData) {
      return { ...consumerData, chartData: pickedRangeReportData.chartData };
    }
    return consumerData;
  }, [consumerData, pickedDateRange, pickedRangeReportData]);

  // Derive chartData.monthly from daily when API doesn't provide it, so 90D and 1Y work
  const effectiveDataForChart = useMemo(() => {
    const base = effectiveDataForChartBase;
    const chartData = base?.chartData;
    if (!chartData?.daily?.seriesData?.[0]?.data?.length || !chartData.daily.xAxisData?.length) {
      return base;
    }
    if (chartData.monthly?.seriesData?.[0]?.data?.length) {
      return base;
    }
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const dailyData = chartData.daily.seriesData[0].data;
    const dailyLabels = chartData.daily.xAxisData;
    const parseDailyLabel = (label) => {
      if (!label || typeof label !== "string") return null;
      const d = new Date(label);
      if (!isNaN(d.getTime())) return d;
      const match = String(label).trim().match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
      if (match) {
        const monthIdx = monthNames.findIndex((m) => m.toLowerCase() === match[2].substring(0, 3).toLowerCase());
        if (monthIdx !== -1) return new Date(parseInt(match[3], 10), monthIdx, parseInt(match[1], 10));
      }
      const m2 = String(label).trim().match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (m2) return new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10));
      return null;
    };
    const isCumulative = dailyData.every((v, i) => i === 0 || v >= dailyData[i - 1]);
    const dailyConsumptions = isCumulative
      ? dailyData.map((v, i) => (i === 0 ? v || 0 : (v || 0) - (dailyData[i - 1] || 0)))
      : [...dailyData];
    const monthMap = {};
    for (let i = 0; i < dailyLabels.length; i++) {
      const d = parseDailyLabel(dailyLabels[i]);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!monthMap[key]) monthMap[key] = { sum: 0, label: `${monthNames[d.getMonth()]} ${d.getFullYear()}` };
      monthMap[key].sum += dailyConsumptions[i] || 0;
    }
    const sortedKeys = Object.keys(monthMap).sort();
    const monthlyConsumptions = sortedKeys.map((k) => monthMap[k].sum);
    const monthlyLabels = sortedKeys.map((k) => monthMap[k].label);
    let run = 0;
    const monthlyCumulative = sortedKeys.map((k) => { run += monthMap[k].sum; return run; });
    return {
      ...base,
      chartData: {
        ...chartData,
        monthly: {
          seriesData: [{ data: monthlyCumulative }],
          xAxisData: monthlyLabels,
        },
      },
    };
  }, [effectiveDataForChartBase]);

  const loadTableData = useCallback(() => {
    setIsTableLoading(true);
    try {
      if (consumerData?.alerts?.length) {
        const sortedAlerts = [...consumerData.alerts].sort(
          (a, b) => new Date(b.tamperDatetime) - new Date(a.tamperDatetime)
        );
        setTableData(mapTamperEvents(sortedAlerts));
      } else {
        setTableData(FALLBACK_ALERT_ROWS);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
      setTableData(FALLBACK_ALERT_ROWS);
    } finally {
      setIsTableLoading(false);
    }
  }, [consumerData, mapTamperEvents]);

  useEffect(() => {
    if (consumerData) {
      loadTableData();
    }
  }, [consumerData, loadTableData]);

  // --------- DASHBOARD SUMMARY STATS (Average, Peak, This/Last Month, Savings) ----------
  const averageDailyKwh = useMemo(() => {
    if (!consumerData) return 284; // fallback to existing UI value
    if (typeof consumerData.monthlyAverage === "number") {
      return consumerData.monthlyAverage;
    }
    if (consumerData.dashboardStats?.averageDailyKwh != null) {
      return consumerData.dashboardStats.averageDailyKwh;
    }
    if (typeof consumerData.averageDaily === "number") {
      return consumerData.averageDaily;
    }
    return 284;
  }, [consumerData]);

  const peakUsageKwh = useMemo(() => {
    if (!consumerData) return 329;
    if (typeof consumerData.peakUsage?.consumption === "number") {
      return consumerData.peakUsage.consumption;
    }
    if (consumerData.dashboardStats?.peakUsageKwh != null) {
      return consumerData.dashboardStats.peakUsageKwh;
    }
    if (typeof consumerData.peakUsage === "number") {
      return consumerData.peakUsage;
    }
    return 329;
  }, [consumerData]);

  // Derive this month / last month from same chart data used in graphs (API chartData.monthly)
  const chartMonthlyComparison = useMemo(() => {
    if (!consumerData?.chartData?.monthly?.seriesData?.[0]?.data) return null;
    const data = consumerData.chartData.monthly.seriesData[0].data;
    if (data.length < 1) return null;
    const isCumulative = data.every((value, index) => index === 0 || value >= data[index - 1]);
    let monthlyConsumptions;
    if (isCumulative) {
      monthlyConsumptions = [];
      for (let i = 0; i < data.length; i++) {
        if (i === 0) monthlyConsumptions.push(data[i] || 0);
        else monthlyConsumptions.push((data[i] || 0) - (data[i - 1] || 0));
      }
    } else {
      monthlyConsumptions = data;
    }
    const thisMonth = monthlyConsumptions[monthlyConsumptions.length - 1] ?? null;
    const lastMonth = monthlyConsumptions.length >= 2 ? (monthlyConsumptions[monthlyConsumptions.length - 2] ?? null) : null;
    return { thisMonth, lastMonth };
  }, [consumerData]);

  const thisMonthKwh = useMemo(() => {
    if (!consumerData) return 2060;
    if (chartMonthlyComparison?.thisMonth != null) {
      return chartMonthlyComparison.thisMonth;
    }
    if (consumerData.dashboardStats?.thisMonthKwh != null) {
      return consumerData.dashboardStats.thisMonthKwh;
    }
    if (typeof consumerData.thisMonthKwh === "number") {
      return consumerData.thisMonthKwh;
    }
    return 2060;
  }, [consumerData, chartMonthlyComparison]);

  const lastMonthKwh = useMemo(() => {
    if (!consumerData) return 2340;
    if (chartMonthlyComparison?.lastMonth != null) {
      return chartMonthlyComparison.lastMonth;
    }
    if (consumerData.dashboardStats?.lastMonthKwh != null) {
      return consumerData.dashboardStats.lastMonthKwh;
    }
    if (typeof consumerData.lastMonthKwh === "number") {
      return consumerData.lastMonthKwh;
    }
    return 2340;
  }, [consumerData, chartMonthlyComparison]);

  const savingsKwh = useMemo(() => {
    if (consumerData?.dashboardStats?.savingsKwh != null) {
      return consumerData.dashboardStats.savingsKwh;
    }
    if (typeof consumerData?.savingsKwh === "number") {
      return consumerData.savingsKwh;
    }
    const diff = lastMonthKwh - thisMonthKwh;
    return diff > 0 ? diff : 0;
  }, [consumerData, lastMonthKwh, thisMonthKwh]);

  // Helper function to map tamper type codes to readable text
  const getTamperTypeText = useCallback((tamperType) => {
    const tamperTypes = {
      1: "Cover Tamper",
      2: "Magnetic Tamper",
      3: "Reverse Current",
      4: "Neutral Disconnect",
      5: "Phase Disconnect",
      6: "Neutral Reverse",
      7: "Phase Reverse",
      8: "Current Imbalance",
      9: "Voltage Imbalance",
      10: "Power Factor",
      11: "Frequency",
      12: "CT Bypass",
      13: "CT Open",
      14: "PT Bypass",
      15: "PT Open",
      24: "Tamper Type 24",
      25: "Tamper Type 25"
    };
    return tamperTypes[tamperType] || `Tamper Type ${tamperType}`;
  }, []);

  // Helper function to get tamper type description
  const getTamperTypeDescription = useCallback((tamperType) => {
    const tamperDescriptions = {
      1: "Meter cover has been removed or tampered with",
      2: "Magnetic interference detected on meter",
      3: "Current flow direction reversed from normal",
      4: "Neutral wire disconnected from meter",
      5: "Phase wire disconnected from meter",
      6: "Neutral wire connected in reverse polarity",
      7: "Phase wire connected in reverse polarity",
      8: "Uneven current distribution across phases",
      9: "Uneven voltage distribution across phases",
      10: "Power factor outside acceptable range",
      11: "Frequency deviation from standard 50Hz",
      12: "Current transformer bypassed",
      13: "Current transformer circuit opened",
      14: "Potential transformer bypassed",
      15: "Potential transformer circuit opened",
      24: "Custom tamper detection type 24 - specific to your meter system",
      25: "Custom tamper detection type 25 - specific to your meter system"
    };
    return tamperDescriptions[tamperType] || `Unknown tamper type ${tamperType}`;
  }, []);

  const formatEventDateTime = useCallback((value) => {
    if (value === null || value === undefined) return "--";
    const formatted = formatFrontendDateTime(value);
    return formatted || value;
  }, []);

  const formatDuration = useCallback((durationValue) => {
    if (typeof durationValue === "string" && durationValue.trim().length > 0) {
      return durationValue.replace(/\s*\d+\s*s\s*/gi, "").trim() || durationValue.trim();
    }

    if (typeof durationValue === "number" && durationValue >= 0) {
      const hours = Math.floor(durationValue / 60);
      const minutes = durationValue % 60;
      return `${hours}h ${minutes}m`;
    }

    if (durationValue && typeof durationValue === "object") {
      const hours = durationValue.hours ?? 0;
      const minutes = durationValue.minutes ?? durationValue.mins ?? 0;
      return `${hours}h ${minutes}m`;
    }

    return "--";
  }, []);

  const formatStatus = useCallback((statusValue) => {
    if (!statusValue) {
      return "Active";
    }

    const normalized = `${statusValue}`.trim().toLowerCase();
    if (normalized.includes("resolve")) {
      return "Resolved";
    }
    if (normalized.includes("active")) {
      return "Active";
    }

    return `${statusValue}`.charAt(0).toUpperCase() + `${statusValue}`.slice(1);
  }, []);

  // Format reading date without seconds
  const formatAmount = useCallback((amount) => {
    if (amount === null || amount === undefined) return "₹0.00";
    return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  const formatReadingDate = useCallback((dateString) => {
    if (!dateString) return "Loading...";
    try {
      const str = String(dateString).trim();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const match = str.match(/^(\d+)(?:st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)/i);
      if (match) {
        const [, dayNum, monthStr, year, hour, min] = match;
        const monthIndex = monthNames.findIndex((m) => m.toLowerCase() === monthStr.toLowerCase());
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
    } catch (error) {
      return dateString;
    }
  }, []);

  const mapTamperEvents = useCallback((rawData = []) => {
    if (!Array.isArray(rawData)) {
      return [];
    }

    const fallbackConsumerName = consumerData?.name || "--";
    const fallbackMeterSerial =
      consumerData?.meterSerialNumber ||
      consumerData?.meterNumber ||
      "--";

    return rawData.map((event, index) => {
      const durationValue =
        event?.duration ||
        event?.durationMinutes ||
        event?.durationInMinutes ||
        event?.durationInMins ||
        event?.durationSeconds ||
        event?.durationText;

      return {
        id: event?.id || event?.eventId || `tamper-event-${index}`,
        meterSerialNumber:
          event?.meterSerialNumber ||
          event?.meterNumber ||
          event?.meterSlNo ||
          fallbackMeterSerial,
        consumerName:
          event?.consumerName ||
          event?.consumer?.name ||
          fallbackConsumerName,
        eventDateTime: formatEventDateTime(
          event?.tamperDatetime ||
            event?.occurredOn ||
            event?.eventDateTime ||
            event?.eventTimestamp
        ),
        eventDescription:
          event?.eventDescription ||
          event?.tamperTypeDesc ||
          getTamperTypeDescription(event?.tamperType) ||
          getTamperTypeText(event?.tamperType) ||
          "--",
        status: formatStatus(
          event?.status ||
            event?.eventStatus ||
            (event?.tamperStatus === 1 ? "Active" : "Resolved")
        ),
        duration: formatDuration(durationValue),
        raw: event,
      };
    });
  }, [consumerData, formatDuration, formatEventDateTime, formatStatus, getTamperTypeDescription, getTamperTypeText]);

  // Helper function to get daily usage from chart data
  const getDailyUsage = () => {
    if (!consumerData?.chartData?.daily?.seriesData?.[0]?.data) return 0;
    const dailyData = consumerData.chartData.daily.seriesData[0].data;
    return dailyData[dailyData.length - 1] || 0; // Get last value
  };

  const getMonthlyUsage = () => {
    if (!consumerData?.chartData?.monthly?.seriesData?.[0]?.data) return 0;
    const monthlyData = consumerData.chartData.monthly.seriesData[0].data;
    return monthlyData[monthlyData.length - 1] || 0; // Get last value
  };

  const getUsageForTimePeriod = () => (timePeriod === "7D" ? getDailyUsage() : getMonthlyUsage());
  const getTrendPercentageForTimePeriod = () => (timePeriod === "7D" ? getDailyTrendPercentage() : getMonthlyTrendPercentage());

  // Parse chart label to Date for range filtering (daily: "DD Mon YYYY", monthly: "Mon YYYY")
  const parseLabelToDateForTable = useCallback((label, isDaily) => {
    if (!label || typeof label !== "string") return null;
    const str = label.trim();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    try {
      if (isDaily) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const match = str.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
        if (match) {
          const monthIdx = monthNames.findIndex((m) => m.toLowerCase() === match[2].substring(0, 3).toLowerCase());
          const year = parseInt(match[3], 10);
          const day = parseInt(match[1], 10);
          if (monthIdx !== -1) return new Date(year, monthIdx, day);
        }
        const match2 = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match2) return new Date(parseInt(match2[1], 10), parseInt(match2[2], 10) - 1, parseInt(match2[3], 10));
        return null;
      }
      const m = str.match(/(\w+)\s+(\d{4})/i);
      if (m) {
        const monthIdx = monthNames.findIndex((x) => x.toLowerCase() === m[1].substring(0, 3).toLowerCase());
        const year = parseInt(m[2], 10);
        if (monthIdx !== -1) return new Date(year, monthIdx, 1);
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  // Effective view for chart/table: same as ConsumerGroupedBarChart — 90D/1Y use monthly, 7D/30D use daily
  const effectiveViewForTable = timePeriod === "90D" || timePeriod === "1Y" ? "monthly" : "daily";

  // Transform chart data into table format, respecting toggle (timePeriod) + pickedDateRange — aligned with graph
  const getConsumptionTableData = useCallback(() => {
    const dataSource = effectiveDataForChart ?? consumerData;
    if (!dataSource?.chartData) return [];

    const chartType = effectiveViewForTable === "daily"
      ? dataSource.chartData.daily
      : dataSource.chartData.monthly;

    if (!chartType?.seriesData?.[0]?.data || !chartType?.xAxisData) {
      return [];
    }

    const data = chartType.seriesData[0].data;
    const labels = chartType.xAxisData;

    // Check if data is cumulative
    const isCumulative = data.every((value, index) => index === 0 || value >= data[index - 1]);

    // Calculate actual consumption values
    let consumptions = [];
    if (isCumulative) {
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          consumptions.push(data[i] || 0);
        } else {
          const currentCumulative = data[i] || 0;
          const previousCumulative = data[i - 1] || 0;
          consumptions.push(currentCumulative - previousCumulative);
        }
      }
    } else {
      consumptions = data;
    }

    let visibleData, visibleConsumptions, visibleLabels, startIndex;
    const isDaily = effectiveViewForTable === "daily";

    // When user picked a date range, filter table to that range (same logic as chart)
    if (pickedDateRange?.startDate && pickedDateRange?.endDate) {
      const rangeStart = new Date(pickedDateRange.startDate.getFullYear(), pickedDateRange.startDate.getMonth(), pickedDateRange.startDate.getDate());
      const rangeEnd = new Date(pickedDateRange.endDate.getFullYear(), pickedDateRange.endDate.getMonth(), pickedDateRange.endDate.getDate());
      const indices = [];
      for (let i = 0; i < labels.length; i++) {
        const labelDate = parseLabelToDateForTable(labels[i], isDaily);
        if (!labelDate) continue;
        const dayStart = new Date(labelDate.getFullYear(), labelDate.getMonth(), labelDate.getDate());
        if (isDaily) {
          if (dayStart.getTime() >= rangeStart.getTime() && dayStart.getTime() <= rangeEnd.getTime()) indices.push(i);
        } else {
          const monthEnd = new Date(labelDate.getFullYear(), labelDate.getMonth() + 1, 0);
          if (dayStart.getTime() <= rangeEnd.getTime() && monthEnd.getTime() >= rangeStart.getTime()) indices.push(i);
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
      // Default: time-period slicing — same as ConsumerGroupedBarChart (7D→7 daily, 30D→30 daily, 90D→3 monthly, 1Y→12 monthly)
      let sliceCount;
      if (effectiveViewForTable === "daily") {
        sliceCount = timePeriod === "7D" ? 7 : timePeriod === "30D" ? 30 : data.length;
      } else {
        sliceCount = timePeriod === "1Y" ? 12 : timePeriod === "90D" ? 3 : data.length;
      }
      startIndex = Math.max(0, data.length - sliceCount);
      visibleData = data.slice(startIndex);
      visibleConsumptions = consumptions.slice(startIndex);
      visibleLabels = labels.slice(startIndex);
    }

    // Transform to table rows, latest first
    return visibleLabels.map((label, index) => ({
      id: (startIndex || 0) + index + 1,
      period: label,
      consumption: visibleConsumptions[index] || 0,
      cumulative: visibleData[index] || 0,
    })).reverse();
  }, [consumerData, effectiveDataForChart, effectiveViewForTable, timePeriod, pickedDateRange, parseLabelToDateForTable]);

  // Memoize table data so it isn't recomputed on every render
  const consumptionTableData = useMemo(
    () => getConsumptionTableData(),
    [getConsumptionTableData]
  );

  // Dynamic Daily Trend Calculation - works with cumulative data for any date range
  const getDailyTrendPercentage = () => {
    if (!consumerData?.chartData?.daily?.seriesData?.[0]?.data) {
      return 0;
    }
    
    const data = consumerData.chartData.daily.seriesData[0].data;
    
    // Need at least 2 data points to calculate trend
    if (data.length < 2) {
      return 0;
    }
    
    // Check if data appears to be cumulative (increasing values)
    const isCumulative = data.every((value, index) => index === 0 || value >= data[index - 1]);
    
    let dailyConsumptions;
    if (isCumulative) {
      // Calculate actual daily consumption from cumulative data
      // For each date D(n), consumption = Total up to D(n) - Total up to D(n-1)
      dailyConsumptions = [];
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          // First day: consumption = cumulative total
          dailyConsumptions.push(data[i] || 0);
        } else {
          // Subsequent days: consumption = current cumulative - previous cumulative
          const currentCumulative = data[i] || 0;
          const previousCumulative = data[i - 1] || 0;
          const dailyConsumption = currentCumulative - previousCumulative;
          dailyConsumptions.push(dailyConsumption);
        }
      }
    } else {
      // Data is already direct consumption values
      dailyConsumptions = data;
    }
    
    // Get the last two daily consumption values for trend calculation
    const yesterdayConsumption = dailyConsumptions[dailyConsumptions.length - 1] || 0;
    const dayBeforeYesterdayConsumption = dailyConsumptions[dailyConsumptions.length - 2] || 0;
    
    // Avoid division by zero
    if (dayBeforeYesterdayConsumption === 0) {
      return 0;
    }
    
    // Calculate percentage change: ((yesterday - dayBeforeYesterday) / dayBeforeYesterday) * 100
    const percentageChange = ((yesterdayConsumption - dayBeforeYesterdayConsumption) / dayBeforeYesterdayConsumption) * 100;
    return Math.round(percentageChange);
  };

  // Dynamic Monthly Trend Calculation - works with cumulative data for any month range
  const getMonthlyTrendPercentage = () => {
    if (!consumerData?.chartData?.monthly?.seriesData?.[0]?.data) {
      return 0;
    }
    
    const data = consumerData.chartData.monthly.seriesData[0].data;
    
    // Need at least 2 data points to calculate trend
    if (data.length < 2) {
      return 0;
    }
    
    // Check if data appears to be cumulative (increasing values)
    const isCumulative = data.every((value, index) => index === 0 || value >= data[index - 1]);
    
    let monthlyConsumptions;
    if (isCumulative) {
      // Calculate actual monthly consumption from cumulative data
      // For each month M(n), consumption = Total up to M(n) - Total up to M(n-1)
      monthlyConsumptions = [];
      for (let i = 0; i < data.length; i++) {
        if (i === 0) {
          // First month: consumption = cumulative total
          monthlyConsumptions.push(data[i] || 0);
        } else {
          // Subsequent months: consumption = current cumulative - previous cumulative
          const currentCumulative = data[i] || 0;
          const previousCumulative = data[i - 1] || 0;
          const monthlyConsumption = currentCumulative - previousCumulative;
          monthlyConsumptions.push(monthlyConsumption);
        }
      }
    } else {
      // Data is already direct consumption values
      monthlyConsumptions = data;
    }
    
    // Get the last two monthly consumption values for trend calculation
    const thisMonthConsumption = monthlyConsumptions[monthlyConsumptions.length - 1] || 0;
    const lastMonthConsumption = monthlyConsumptions[monthlyConsumptions.length - 2] || 0;
    
    // Avoid division by zero
    if (lastMonthConsumption === 0) {
      return 0;
    }
    
    // Calculate percentage change: ((thisMonth - lastMonth) / lastMonth) * 100
    const percentageChange = ((thisMonthConsumption - lastMonthConsumption) / lastMonthConsumption) * 100;
    return Math.round(percentageChange);
  };

  // Bottom sheet handlers
  const handleConsumerPress = useCallback(() => {
    console.log('🖱️ Consumer pressed, UID:', consumerData?.uniqueIdentificationNo);
    if (consumerData?.uniqueIdentificationNo) {
      setSelectedConsumerUid(consumerData.uniqueIdentificationNo);
      setBottomSheetVisible(true);
      console.log('✅ Bottom sheet opened');
    } else {
      console.log('❌ No consumer UID available');
    }
  }, [consumerData?.uniqueIdentificationNo]);

  const handleBottomSheetClose = useCallback(() => {
    setBottomSheetVisible(false);
    setSelectedConsumerUid(null);
  }, []);

  // Helper function to parse and format date from bar label
  const parseDateFromBarLabel = useCallback((label, viewType) => {
    if (!label) return null;

    try {
      let date;
      const currentYear = new Date().getFullYear();
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                         "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

      if (viewType === "daily") {
        // For daily view, label could be in various formats:
        // "21st Nov 2025", "Nov 21, 2025", "21-Nov-2025", "2025-11-21", "21/11/2025", "25 Nov", etc.
        
        // First, try to parse it directly as a date
        date = new Date(label);
        
        // If parsing failed, try to extract date parts from common formats
        if (isNaN(date.getTime())) {
          // Try format like "21st Nov 2025" or "21 Nov 2025" (with year)
          const dateMatch = label.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i);
          if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const monthName = dateMatch[2];
            const year = parseInt(dateMatch[3]);
            const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
            if (!isNaN(monthIndex)) {
              date = new Date(year, monthIndex, day);
            }
          }
          
          // If still invalid, try format like "25 Nov" or "25th Nov" (without year - use current year)
          if (isNaN(date.getTime())) {
            const dateMatchNoYear = label.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)/i);
            if (dateMatchNoYear) {
              const day = parseInt(dateMatchNoYear[1]);
              const monthName = dateMatchNoYear[2];
              const monthIndex = monthNames.findIndex(m => 
                m.toLowerCase() === monthName.substring(0, 3).toLowerCase()
              );
              if (monthIndex !== -1) {
                date = new Date(currentYear, monthIndex, day);
                console.log(`✅ Parsed date from "${label}": ${date.toISOString()}`);
              }
            }
          }
          
          // If still invalid, try format like "DD-MM-YYYY" or "DD/MM/YYYY"
          if (isNaN(date.getTime())) {
            const dateMatch2 = label.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
            if (dateMatch2) {
              const day = parseInt(dateMatch2[1]);
              const month = parseInt(dateMatch2[2]) - 1; // Month is 0-indexed
              const year = parseInt(dateMatch2[3]);
              date = new Date(year, month, day);
            }
          }
          
          // If still invalid, try format like "YYYY-MM-DD"
          if (isNaN(date.getTime())) {
            const dateMatch3 = label.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
            if (dateMatch3) {
              const year = parseInt(dateMatch3[1]);
              const month = parseInt(dateMatch3[2]) - 1; // Month is 0-indexed
              const day = parseInt(dateMatch3[3]);
              date = new Date(year, month, day);
            }
          }
          
          // Last resort: use today's date
          if (isNaN(date.getTime())) {
            console.warn('Could not parse date from label:', label, 'Using today\'s date');
            date = new Date();
          }
        }
      } else {
        // For monthly view, label is month name like "Jan", "Feb", etc.
        // Get the first day of that month in the current year
        const monthIndex = monthNames.findIndex(m => 
          m.toLowerCase() === label.substring(0, 3).toLowerCase()
        );
        
        if (monthIndex !== -1) {
          date = new Date(currentYear, monthIndex, 1);
        } else {
          // Fallback: use first day of current month
          date = new Date();
          date.setDate(1);
        }
      }

      if (isNaN(date.getTime())) {
        console.warn('Invalid date parsed, using today:', label);
        date = new Date();
      }

      // Format as YYYY-MM-DD for API
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Error parsing date from label:', label, error);
      // Fallback: return today's date in YYYY-MM-DD format
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }, []);

  // Handle bar press from chart - navigate to dedicated table page
  const handleBarPress = useCallback(async (barData) => {
    console.log('📊 Bar pressed:', barData);
    
    // Extract date from bar data - prefer originalLabel if available (from full data array)
    const barLabel = barData?.originalLabel || barData?.date || barData?.label || '';
    const viewTypeForParsing = barData?.viewType || selectedView;
    const formattedDate = parseDateFromBarLabel(barLabel, viewTypeForParsing);
    
    // Get meterId - priority: consumerData > logged-in user
    let meterId = consumerData?.meterId || 
                  consumerData?.meterSerialNumber || 
                  consumerData?.meterNumber || 
                  null;

    // If not found in consumerData, try to get from logged-in user
    if (!meterId) {
      try {
        const user = await getUser();
        meterId = user?.meterId || user?.meterSerialNumber || null;
        console.log('📋 MeterId from logged-in user:', meterId);
      } catch (error) {
        console.error('❌ Error getting user data:', error);
      }
    }

    // Convert to string if it's a number (API expects string)
    if (meterId) {
      meterId = String(meterId).trim();
    }

    console.log('📅 Extracted date info:', {
      originalLabel: barData?.originalLabel,
      displayLabel: barData?.label,
      barLabel: barLabel,
      formattedDate,
      viewType: viewTypeForParsing,
      meterId,
      originalIndex: barData?.index,
      displayIndex: barData?.displayIndex,
      consumerDataMeterId: consumerData?.meterId,
      consumerDataMeterSerial: consumerData?.meterSerialNumber
    });

    if (!formattedDate) {
      console.error('❌ Could not parse date from bar label:', barLabel);
      return;
    }

    if (!meterId) {
      console.error('❌ Meter ID not found');
      return;
    }

    // Navigate with all necessary data
    navigation.navigate('ConsumerDataTable', {
      date: formattedDate,
      meterId: meterId, // Pass as string
      viewType: viewTypeForParsing,
      barData: barData,
      consumerData: consumerData // Pass full consumerData for fallback
    });
  }, [navigation, consumerData, isLoading, selectedView, parseDateFromBarLabel]);

  const handleViewTamperEvent = useCallback((event) => {
    console.log("🔎 View tamper event", event?.raw || event);
  }, []);


  const darkOverlay = React.useMemo(() => isDark ? {
    container: { backgroundColor: themeColors.screen },
    contentOnTop: { backgroundColor: themeColors.screen },
    amountSection: { backgroundColor: themeColors.screen },
    amountContainer: { backgroundColor: '#163B7C' },
    dueText: { color: themeColors.textPrimary },
    dateText: { color: themeColors.textSecondary },
    greenBox: { backgroundColor: COLORS.secondaryColor },
    paynowbox: { backgroundColor: COLORS.secondaryFontColor },
    paynowText: { color: COLORS.primaryFontColor },
    dueDaysText: { color: themeColors.textSecondary },
    meterContainer: { backgroundColor: themeColors.screen },
    meterInfoContainer: { backgroundColor: '#163B7C' },
    meterConsumerText: { color: themeColors.textPrimary },
    LastCommunicationText: { color: themeColors.textSecondary },
    tapIndicator: { backgroundColor: themeColors.accent },
    tapIndicatorText: { color: themeColors.textOnPrimary },
    meterNumberText: { color: themeColors.textPrimary },
    lastCommunicationTimeText: { color: themeColors.textSecondary },
    graphSection: {},
    energyText: { color: themeColors.textPrimary },
    pickDateRow: { backgroundColor: '#1A1F2E' },
    pickDateText: { color: themeColors.textPrimary },
    graphsContainer: { backgroundColor: '#1A1F2E' },
    thismonthText: { color: themeColors.textPrimary },
    kwhText: { color: themeColors.accent },
    lastText: { color: themeColors.textSecondary },
    viewDropdownButton: { backgroundColor: themeColors.accent },
    viewDropdownButtonText: { color: themeColors.textOnPrimary },
    viewDropdownContent: { backgroundColor: themeColors.card, borderColor: themeColors.cardBorder },
    viewDropdownItem: { borderBottomColor: themeColors.cardBorder },
    viewDropdownItemText: { color: themeColors.textPrimary },
    viewDropdownItemSelected: { backgroundColor: themeColors.accent + '20' },
    viewDropdownItemTextSelected: { color: themeColors.accent },
    timePeriodButton: {},
    timePeriodButtonActive: { backgroundColor: themeColors.brandBlue },
    timePeriodButtonText: { color: themeColors.textPrimary },
    timePeriodButtonTextActive: { color: themeColors.textOnPrimary },
    usageStatsCard: { backgroundColor: '#1A1F2E', borderColor: themeColors.cardBorder },
    usageStatsCardTitle: { color: themeColors.textSecondary },
    usageStatsCardValueBlue: { color: themeColors.brandBlue },
    usageStatsCardValueRed: { color: themeColors.danger },
    comparisonCard: { backgroundColor: '#1A1F2E', borderColor: themeColors.cardBorder },
    comparisonTitle: { color: themeColors.textPrimary },
    monthlyValueLabel: { color: themeColors.textSecondary },
    monthlyValueBlue: { color: themeColors.brandBlue },
    monthlyValueGrey: { color: themeColors.textSecondary },
    progressBar: { backgroundColor: themeColors.progressBarTrack },
    progressBarFill: { backgroundColor: themeColors.accent },
    savingsMessage: { color: themeColors.savingsText },
    tableTitle: { color: themeColors.textPrimary },
    tableContainer: {},
    meterSiText: { color: themeColors.textPrimary },
    consumptionValue: { color: themeColors.accent },
    cumulativeValue: { color: themeColors.textPrimary },
  } : {}, [isDark, themeColors]);

  const screenRootBg = isDark ? themeColors.screen : COLORS.secondaryFontColor;

  return (
    <View style={[styles.screenRoot, { backgroundColor: screenRootBg }]}>
      <ScrollView
        style={[styles.Container, darkOverlay.container]}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchConsumerData}
            colors={[themeColors.accent]}
            tintColor={themeColors.accent}
          />
        }
      >
        <View style={[styles.Container, darkOverlay.container]}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <DashboardHeader
            navigation={navigation}
            showBalance={false}
            consumerData={consumerData}
            isLoading={isLoading}
          />

          <View style={[styles.contentOnTop, darkOverlay.contentOnTop]}>
          <View style={[styles.amountSection, darkOverlay.amountSection]}>
            <View style={[styles.amountContainer, darkOverlay.amountContainer]}>
              <Text style={[styles.dueText, darkOverlay.dueText]}>
                Due Amount: {isLoading ? "Loading..." : formatAmount(consumerData?.totalOutstanding)}
              </Text>
              <Text style={[styles.dateText, darkOverlay.dateText]}>
                Due on {formatDueDateDisplay(consumerData?.dueDate)}
              </Text>
            </View>
            <View style={[styles.greenBox, darkOverlay.greenBox]}>
              <View style={styles.payInfoContainer}>
                <GlobeShield
                  width={28}
                  height={28}
                  fill={themeColors.textOnPrimary}
                  style={styles.shieldIcon}
                />
                <View>
                  <Text style={styles.payText}>Pay securely</Text>
                  <Text style={styles.tostayText}>to stay on track.</Text>
                  <Text style={styles.avoidText}>Avoid service disruption.</Text>
                </View>
              </View>
              <View style={styles.paynowboxContainer}>
                <Pressable style={[styles.paynowbox, darkOverlay.paynowbox]} onPress={() => navigation.navigate('PostPaidRechargePayments')}>
                  <Text style={[styles.paynowText, darkOverlay.paynowText]}>Pay Now</Text>
                </Pressable>
                <Text style={[styles.dueDaysText, darkOverlay.dueDaysText]}>10 Days left</Text>
              </View>
            </View>
          </View>

          <View style={[styles.meterContainer, darkOverlay.meterContainer]}>
            <TouchableOpacity
              style={[styles.meterInfoContainer, darkOverlay.meterInfoContainer]}
              onPress={handleConsumerPress}
            >
              <View style={styles.leftContainer}>
                <View style={styles.meterInfoRow}>
                  <Meter width={30} height={30} style={{ marginTop: 5 }} />
                  <View style={styles.meterConsumerRow}>
                    <Text style={[styles.meterConsumerText, darkOverlay.meterConsumerText]}>
                      {consumerData?.name || consumerData?.consumerName || "Loading..."}
                    </Text>
                  </View>
                </View>
                <View style={styles.lastCommunicationLabelWrap}>
                  <Text style={[styles.LastCommunicationText, darkOverlay.LastCommunicationText]}>
                    Last Communication
                  </Text>
                </View>
              </View>

              <View style={styles.rightContainer}>
                <View style={[styles.tapIndicator, darkOverlay.tapIndicator, styles.rightBlockEnd]}>
                  <Text style={[styles.tapIndicatorText, darkOverlay.tapIndicatorText]}>Tap for details</Text>
                </View>
                <View style={[styles.lastCommunicationLeft, styles.rightBlockEnd]}>
                  <LastCommunicationIcon width={15} height={10} style={{ marginRight: 5 }} />
                  <Text style={[styles.meterNumberText, darkOverlay.meterNumberText]}>
                    {consumerData?.meterSerialNumber || "Loading..."}
                  </Text>
                </View>
                <View style={styles.rightBlockEnd}>
                  <Text style={[styles.lastCommunicationTimeText, darkOverlay.lastCommunicationTimeText]}>
                    {formatReadingDate(consumerData?.readingDate)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
            {/* <View style={styles.lastCommunicationContainer}>
                <Text style={styles.meterUIDText}>
                  UID: {consumerData?.uniqueIdentificationNo || "Loading..."}
                </Text>
            </View> */}
          </View>

          <View style={[styles.graphSection, darkOverlay.graphSection]}>
            <View style={styles.energySummaryHeader}>
              <Text style={[styles.energyText, darkOverlay.energyText]}>Energy Summary</Text>
              <Pressable style={[styles.pickDateRow, darkOverlay.pickDateRow]} onPress={() => setShowDatePicker(true)}>
                <Text style={[styles.pickDateText, darkOverlay.pickDateText]} numberOfLines={1}>
                  {pickedDateRange
                    ? (pickedDateRange.startDate.getTime() === pickedDateRange.endDate.getTime()
                        ? `${pickedDateRange.startDate.getDate().toString().padStart(2, "0")}/${(pickedDateRange.startDate.getMonth() + 1).toString().padStart(2, "0")}/${pickedDateRange.startDate.getFullYear()}`
                        : `${pickedDateRange.startDate.getDate().toString().padStart(2, "0")}/${(pickedDateRange.startDate.getMonth() + 1).toString().padStart(2, "0")}/${pickedDateRange.startDate.getFullYear()} - ${pickedDateRange.endDate.getDate().toString().padStart(2, "0")}/${(pickedDateRange.endDate.getMonth() + 1).toString().padStart(2, "0")}/${pickedDateRange.endDate.getFullYear()}`)
                    : "Pick a Date"}
                </Text>
                <CalendarIcon width={18} height={18} fill={isDark ? themeColors.textPrimary : COLORS.secondaryFontColor} style={styles.pickDateIcon} />
              </Pressable>
            <CalendarDatePicker
              visible={showDatePicker}
              onClose={() => setShowDatePicker(false)}
              value={pickedDateRange}
              onChange={(range) => setPickedDateRange(range)}
              allowRangeSelection={true}
            />
            </View>

            <View style={[styles.graphsContainer, darkOverlay.graphsContainer]}>
              <View style={styles.usageSummaryRow}>
                <View style={styles.usageSummaryLeft}>
                  {(() => {
                    const labels = USAGE_CARD_LABELS[timePeriod] || USAGE_CARD_LABELS["30D"];
                    const trendPct = getTrendPercentageForTimePeriod();
                    return (
                      <>
                        <Text style={[styles.thismonthText, darkOverlay.thismonthText]}>{labels.title}</Text>
                        <View style={styles.usageValueRow}>
                          <Text style={[styles.kwhText, darkOverlay.kwhText]}>
                            {isLoading ? "Loading..." : getUsageForTimePeriod()} kWh
                          </Text>
                          <View style={[
                            styles.tenPercentageTextContainer,
                            trendPct < 0 && styles.negativeTrendContainer
                          ]}>
                            <Text style={styles.percentText}>
                              {isLoading ? "..." : `${Math.abs(trendPct)}%`}
                            </Text>
                            <Arrow 
                              width={12} 
                              height={12} 
                              fill={trendPct >= 0 ? themeColors.accent : "#FF6B6B"} 
                              style={trendPct < 0 ? { transform: [{ rotate: '180deg' }] } : {}}
                            />
                          </View>
                          <Text style={[styles.lastText, darkOverlay.lastText]}>{labels.comparisonLabel}</Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
                <View style={styles.viewDropdownWrapper} ref={viewDropdownRef} collapsable={false}>
                  <TouchableOpacity
                    style={[styles.viewDropdownButton, darkOverlay.viewDropdownButton]}
                    onPress={() => {
                      if (showViewDropdown) {
                        setShowViewDropdown(false);
                      } else {
                        viewDropdownRef.current?.measureInWindow((x, y, width, height) => {
                          setDropdownButtonLayout({ x, y, width, height });
                          setShowViewDropdown(true);
                        });
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.viewDropdownButtonText, darkOverlay.viewDropdownButtonText]}>
                      {displayMode === "chart" ? "Chart" : "Table"}
                    </Text>
                    <DropdownIcon width={14} height={14} fill={COLORS.secondaryFontColor} />
                  </TouchableOpacity>
                  {showViewDropdown && (
                    <Modal
                      visible={showViewDropdown}
                      transparent
                      animationType="fade"
                      onRequestClose={() => setShowViewDropdown(false)}
                    >
                      <Pressable
                        style={styles.viewDropdownOverlay}
                        onPress={() => setShowViewDropdown(false)}
                      >
                        <Pressable
                          style={[
                            styles.viewDropdownContent,
                            darkOverlay.viewDropdownContent,
                            {
                              position: "absolute",
                              top: dropdownButtonLayout.y + dropdownButtonLayout.height + 4,
                              left: dropdownButtonLayout.x,
                              minWidth: dropdownButtonLayout.width,
                            },
                          ]}
                          onPress={() => {}}
                        >
                          {VIEW_OPTIONS.map((option) => (
                            <Pressable
                              key={option}
                              style={[
                                styles.viewDropdownItem,
                                darkOverlay.viewDropdownItem,
                                displayMode === option.toLowerCase() && styles.viewDropdownItemSelected,
                                displayMode === option.toLowerCase() && darkOverlay.viewDropdownItemSelected
                              ]}
                              onPress={() => {
                                setDisplayMode(option.toLowerCase());
                                setShowViewDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.viewDropdownItemText,
                                darkOverlay.viewDropdownItemText,
                                displayMode === option.toLowerCase() && styles.viewDropdownItemTextSelected,
                                displayMode === option.toLowerCase() && darkOverlay.viewDropdownItemTextSelected
                              ]}>
                                {option}
                              </Text>
                            </Pressable>
                          ))}
                        </Pressable>
                      </Pressable>
                    </Modal>
                  )}
                </View>
              </View>

              <View style={styles.timePeriodRow}>
                {TIME_PERIODS.map((period) => {
                  const isActive = !pickedDateRange && timePeriod === period;
                  return (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.timePeriodButton,
                        darkOverlay.timePeriodButton,
                        isActive && [styles.timePeriodButtonActive, darkOverlay.timePeriodButtonActive]
                      ]}
                      onPress={() => {
                        setPickedDateRange(null);
                        setPickedRangeReportData(null);
                        setTimePeriod(period);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.timePeriodButtonText,
                        darkOverlay.timePeriodButtonText,
                        isActive && [styles.timePeriodButtonTextActive, darkOverlay.timePeriodButtonTextActive]
                      ]}>
                        {period}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Chart or Table View - full width of graphsContainer so chart aligns with header/buttons above */}
              {displayMode === "chart" ? (
                <View style={{ width: "100%", alignItems: "stretch", marginTop: 15 }}>
                  {isLoading || (pickedDateRange && pickedRangeReportLoading) ? (
                    <SkeletonLoader variant="barchart" style={{ marginVertical: 20 }} lines={selectedView === "daily" ? 10 : 12} />
                  ) : (
                    <ConsumerGroupedBarChart
                      viewType={selectedView}
                      timePeriod={timePeriod}
                      data={effectiveDataForChart}
                      loading={isLoading}
                      onBarPress={handleBarPress}
                      pickedDateRange={pickedDateRange}
                    />
                  )}
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {isLoading || (pickedDateRange && pickedRangeReportLoading) ? (
                    <SkeletonLoader variant="table" style={{ marginVertical: 20 }} lines={5} columns={3} />
                  ) : (
                    <Table
                      data={consumptionTableData}
                      loading={isLoading}
                      emptyMessage={`No ${effectiveViewForTable} consumption data available`}
                      showSerial={true}
                      showPriority={false}
                      containerStyle={styles.consumptionTable}
                      columns={[
                        { 
                          key: 'period', 
                          title: effectiveViewForTable === "daily" ? 'Date' : 'Month', 
                          flex: 1.5,
                          align: 'left'
                        },
                        { 
                          key: 'consumption', 
                          title: 'Consumption (kWh)', 
                          flex: 1.5,
                          align: 'right',
                          render: (item) => (
                            <Text style={[styles.consumptionValue, darkOverlay.consumptionValue]}>
                              {item.consumption.toFixed(2)}
                            </Text>
                          )
                        },
                        { 
                          key: 'cumulative', 
                          title: 'Cumulative (kWh)', 
                          flex: 1.5,
                          align: 'right',
                          render: (item) => (
                            <Text style={[styles.cumulativeValue, darkOverlay.cumulativeValue]}>
                              {item.cumulative.toFixed(2)}
                            </Text>
                          )
                        }
                      ]}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
          <View style={styles.usageStatsContainer}>
            <View style={styles.usageStatsTopRow}>
              <View style={[styles.usageStatsCard, darkOverlay.usageStatsCard]}>
                <Text style={[styles.usageStatsCardTitle, darkOverlay.usageStatsCardTitle]}>Average Daily</Text>
                <Text style={[styles.usageStatsCardValueBlue, darkOverlay.usageStatsCardValueBlue]}>
                  {averageDailyKwh.toLocaleString("en-IN")} kWh
                </Text>
              </View>
              <View style={[styles.usageStatsCard, darkOverlay.usageStatsCard]}>
                <Text style={[styles.usageStatsCardTitle, darkOverlay.usageStatsCardTitle]}>Peak Usage</Text>
                <Text style={[styles.usageStatsCardValueRed, darkOverlay.usageStatsCardValueRed]}>
                  {peakUsageKwh.toLocaleString("en-IN")} kWh
                </Text>
              </View>
            </View>
            <View style={[styles.comparisonCard, darkOverlay.comparisonCard]}>
              <View style={styles.comparisonHeader}>
                <View style={styles.doubleArrowIcon}>
                  {isDark ? (
                    <ComparisonIconWhite width={20} height={20} />
                  ) : (
                    <ComparisonIconBlack width={20} height={20} />
                  )}
                </View>
                <Text style={[styles.comparisonTitle, darkOverlay.comparisonTitle]}>Comparison</Text>
              </View>
              <View style={styles.monthlyValuesContainer}>
                <View style={styles.monthlyValueItem}>
                  <Text style={[styles.monthlyValueLabel, darkOverlay.monthlyValueLabel]}>This Month</Text>
                  <Text style={[styles.monthlyValueBlue, darkOverlay.monthlyValueBlue]}>
                    {thisMonthKwh.toLocaleString("en-IN")} kWh
                  </Text>
                </View>
                <View style={styles.monthlyValueItem2}>
                  <Text style={[styles.monthlyValueLabel, darkOverlay.monthlyValueLabel]}>Last Month</Text>
                  <Text style={[styles.monthlyValueGrey, darkOverlay.monthlyValueGrey]}>
                    {lastMonthKwh.toLocaleString("en-IN")} kWh
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, darkOverlay.progressBar]}>
                  <View style={[styles.progressBarFill, darkOverlay.progressBarFill]} />
                  <View style={styles.progressBarRemainder} />
                </View>
              </View>
              <View style={styles.savingsMessageRow}>
                <PiggybankIcon width={16} height={16} fill={isDark ? themeColors.accent : COLORS.secondaryColor} style={styles.savingsMessageIcon} />
                <Text style={[styles.savingsMessage, darkOverlay.savingsMessage]}>
                  You saved {savingsKwh.toLocaleString("en-IN")} kWh
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.tableContainer, darkOverlay.tableContainer]}>
            <Text style={[styles.tableTitle, darkOverlay.tableTitle]}>Alerts</Text>
          </View>
          <View style={styles.tableScrollWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.tableContent}>
                <Table
                  data={tableData}
                  loading={isTableLoading}
                  skeletonLines={5}
                  emptyMessage="No tamper events available"
                  showSerial={true}
                  showPriority={false}
                  containerStyle={styles.alertsTable}
                  minTableWidth={900}
                  columns={[
                    { 
                      key: 'meterSerialNumber', 
                      title: 'Meter SI No', 
                      width: 110,
                      align: 'left',
                      render: (item) => (
                        <View style={styles.meterSiCell}>
                          <StatusBlinkingDot status={item.status} />
                          <Text style={[styles.meterSiText, darkOverlay.meterSiText]}>{item.meterSerialNumber}</Text>
                        </View>
                      )
                    },
                    { 
                      key: 'consumerName', 
                      title: 'Consumer Name', 
                      width: 160,
                      align: 'left'
                    },
                    { 
                      key: 'eventDateTime', 
                      title: 'Event Date Time', 
                      width: 160,
                      align: 'left'
                    },
                    { 
                      key: 'eventDescription', 
                      title: 'Event Description', 
                      width: 140,
                      align: 'left'
                    },
                    {
                      key: 'status',
                      title: 'Status',
                      width: 120,
                      align: 'left',
                      render: (item) => (
                        <View style={[
                          styles.statusBadge,
                          item.status === "Resolved" ? styles.statusResolved : styles.statusActive
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            item.status === "Resolved" ? styles.statusResolvedText : styles.statusActiveText
                          ]}>
                            {item.status}
                          </Text>
                        </View>
                      )
                    },
                    { 
                      key: 'duration', 
                      title: 'Duration', 
                      width: 90,
                      align: 'left'
                    }
                  ]}
                />
              </View>
            </ScrollView>
          </View>
          </View>
        </View>
      </ScrollView>

      {/* Consumer Details Bottom Sheet */}
      <ConsumerDetailsBottomSheet
        visible={bottomSheetVisible}
        consumerUid={selectedConsumerUid}
        onClose={handleBottomSheetClose}
      />
      
      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} />
    </View>
  );
};

export default PostPaidDashboard;

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
  },
  contentOnTop: {
    zIndex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
  },
  graphSection: {
    padding: 16,
    paddingBottom:5 ,
  },
  energySummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  energyText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Bold",
  },
  toggleGroup: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleGroupColumn: {
    flexDirection: "column",
    alignItems: "flex-end",
    minWidth: 130,
  },
  dailyText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
    textAlign: "center",
  },
  monthlyText: {
    color: COLORS.secondaryColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 50,
    textAlign: "center",
  },
  LastCommunicationText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-SemiBold",
  },
  separator: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    marginHorizontal: 4,
    paddingVertical: 4,
  },
  pickDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 5,
  },
  pickDateText: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryColor,
  },
  pickDateIcon: {
    flexShrink: 0,
  },
  textToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 120,
    justifyContent: "flex-end",
  },
  toggleText: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
  },
  toggleTextItem: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
  },
  toggleTextSelected: {
    color: COLORS.secondaryColor,
  },
  toggleSeparator: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    marginHorizontal: 4,
  },
  toggleButton: {
    minHeight: 30,
    paddingHorizontal: 8,
  },
  graphsContainer: {
    backgroundColor: "#eef8f0",
    paddingHorizontal: 15,
    paddingTop: 15,
    borderRadius: 5,
    paddingBottom: 5,
    overflow: "hidden",
  },
  usageSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  usageSummaryLeft: {
    flex: 1,
  },
  usageValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  percentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  viewDropdownWrapper: {
    marginLeft: 12,
  },
  viewDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondaryColor,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 5,
    gap: 6,
    minHeight: 36,
  },
  viewDropdownButtonText: {
    color: COLORS.secondaryFontColor,
    fontSize: 13,
    fontFamily: "Manrope-SemiBold",
  },
  viewDropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  viewDropdownContent: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 5,
    minWidth: 140,
  },
  viewDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
  },
  viewDropdownItemSelected: {
    backgroundColor: "#E8F5E9",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  viewDropdownItemText: {
    fontSize: 14,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
  },
  viewDropdownItemTextSelected: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-SemiBold",
  },
  timePeriodRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 8,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  timePeriodButtonActive: {
    backgroundColor: colors.color_brand_blue,
  },
  timePeriodButtonText: {
    fontSize: 13,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.primaryFontColor,
  },
  timePeriodButtonTextActive: {
    color: COLORS.secondaryFontColor,
  },
  thismonthText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  kwhText: {
    color: COLORS.secondaryColor,
    fontSize: 14,
    fontFamily: "Manrope-Bold",
  },
  tenPercentageTextContainer: {
    backgroundColor: COLORS.secondaryColor,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    borderRadius: 20,
    height: 19,
    gap: 4,
  },
  percentText: {
    color: COLORS.secondaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-SemiBold",
    lineHeight: 16,
    includeFontPadding: false,
  },
  lastText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
  },
  logo: {
    width: 70,
    height: 70,
    zIndex: 1,
  },
  ripple: {
    position: "absolute",
    borderWidth: 1.2,
    borderColor: "#ffffff50",
  },
  amountSection: {
    paddingHorizontal: 16,
    backgroundColor: "#eef8f0",
  },
  amountContainer: {
    backgroundColor: COLORS.primaryColor,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderRadius: 5,
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 10,
  },
  paynowboxContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 12,
  },
  dueText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Medium",
  },
  dueDaysText: {
    color: COLORS.secondaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
  },
  dateText: {
    color: COLORS.secondaryFontColor,
    fontSize: 11,
    fontFamily: "Manrope-Regular",
  },
  greenBox: {
    flexDirection: "row",
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 5,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    alignItems: "center",
    padding: 10,
    marginVertical: 4,
  },
  payInfoContainer: {
    flexDirection: "row",
  },
  shieldIcon: {
    marginRight: 12,
    marginTop: 10,
  },
  payText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
  },
  tostayText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
  },
  avoidText: {
    color: COLORS.secondaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    // marginBottom: 10,
  },
  paynowbox: {
    backgroundColor: COLORS.secondaryFontColor,
    height: 35,
    width: 95,
    borderRadius: 5,
    justifyContent: "center",
  },
  paynowText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    textAlign: "center",
  },
  meterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: "#eef8f0",
  },
  meterInfoContainer: {
    backgroundColor: COLORS.primaryColor,
    borderRadius: 5,
    paddingTop: 13,
    paddingBottom: 13,
    paddingLeft: 13,
    paddingRight: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    minHeight: 90,
  },

  leftContainer: {
    flexDirection: "column",
    justifyContent: "space-between",
    flex: 1,
    marginRight: 10,
  },
  meterInfoRow: {    
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
  },
  meterConsumerRow: {
    flexDirection: "column",
    justifyContent: "flex-start",
    gap: 13,
  },
  lastCommunicationLabelWrap: {
    marginLeft: 40,
  },
  LastCommunicationRow:{    flexDirection: "column",
    justifyContent: "flex-end",
    alignItems:"flex-end",
    // gap: 4
  },
  meterConsumerText: {
    color: COLORS.secondaryFontColor,
    width: "70%",
    fontSize: 14,
    fontFamily: "Manrope-Bold",
  },

  meterNumberText: {
    color: COLORS.secondaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Bold",
  },

  rightContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flex: 1,
    gap: 4,
  },
  rightBlockEnd: {
    alignSelf: "flex-end",
  },

  tapIndicator: {
    backgroundColor: COLORS.secondaryColor,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },

  tapIndicatorText: {
    fontSize: 10,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.secondaryFontColor,
  },

  meterUIDText: {
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Medium",
    paddingHorizontal: 5,
    paddingVertical: 2,
  },

  lastCommunicationContainer: {
    backgroundColor: COLORS.secondaryLightColor,
    borderRadius: 5,
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  lastCommunicationLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  LastCommunicationIcon: {
    marginRight: 5,
  },

  lastCommunicationText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
    textAlign: "right",

  },
  lastCommunicationTimeText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
    textAlign: "right",
  },
  datePickerSection: {
    marginBottom: 20,
    gap: 10,
  },
  datePickerLabel: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
    marginBottom: 10,
  },
  tableContainer: {
    paddingHorizontal: 16,
  },
  tableTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
  },
  tableScrollWrapper: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  tableScrollContent: {
    paddingBottom: 10,
  },
  tableContent: {
    minWidth: 800,
  },
  alertsTable: {
    paddingHorizontal: 0,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  statusBadgeText: {
    fontFamily: "Manrope-SemiBold",
    fontSize: 12,
  },
  statusBlinkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meterSiCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  meterSiText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 12,
  },
  statusResolved: {
    backgroundColor: "#DEF5E5",
  },
  statusResolvedText: {
    color: "#1E7A3F",
  },
  statusActive: {
    backgroundColor: "#FFF4E5",
  },
  statusActiveText: {
    color: "#C17B00",
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E6F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondaryFontColor,
  },
  viewTableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondaryFontColor,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.secondaryColor,
  },
  viewTableButtonText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.secondaryColor,
    marginRight: 8,
  },
  chartInstructionText: {
    fontSize: 11,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 5,
  },
  negativeTrendContainer: {
    backgroundColor: "#FF6B6B",
  },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 6,
    padding: 2,
    borderWidth: 1,
    borderColor: "#E2E6F0",
    height: 32,
  },
  toggleButton: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 65,
    alignItems: "center",
    justifyContent: "center",
    height: 28,
  },
  toggleButtonFullWidth: {
    flex: 1,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.secondaryColor,
  },
  toggleTextActive: {
    color: COLORS.secondaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-SemiBold",
  },
  toggleTextInactive: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
  },
  consumptionTable: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  consumptionValue: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-SemiBold",
    fontSize: 12,
  },
  cumulativeValue: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
  },
  usageStatsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    gap: 10,
  },
  usageStatsTopRow: {
    flexDirection: "row",
    gap: 11,
  },
  usageStatsCard: {
    flex: 1,
    backgroundColor: "#eef8f0",
    borderRadius: 5,
    padding: 16,
  },
  usageStatsCardTitle: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    marginBottom: 8,
  },
  usageStatsCardValueBlue: {
    fontSize: 18,
    fontFamily: "Manrope-Bold",
    color: colors.color_brand_blue,
    lineHeight: 28,
  },
  usageStatsCardValueRed: {
    fontSize: 18,
    fontFamily: "Manrope-Bold",
    color: colors.color_danger,
    lineHeight: 28,
  },
  comparisonCard: {
    backgroundColor: "#eef8f0",
    borderRadius: 5,
    padding: 16,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  doubleArrowIcon: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  doubleArrowText: {
    fontSize: 16,
    color: COLORS.primaryFontColor,
  },
  comparisonTitle: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
  },
  monthlyValuesContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  monthlyValueItem: {
    alignItems: "flex-start",
    flex:1,
  },
  monthlyValueItem2: {
    alignItems: "flex-end",
  },
  monthlyValueLabel: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    marginBottom: 4,
  },
  monthlyValueBlue: {
    fontSize: 20,
    fontFamily: "Manrope-Bold",
    color: colors.color_brand_blue,
    lineHeight: 28,
  },
  monthlyValueGrey: {
    fontSize: 20,
    fontFamily: "Manrope-Bold",
    color: colors.color_text_secondary,
    lineHeight: 28,
  },
  progressBarContainer: {
    marginBottom: 8,
  },
  progressBar: {
    flexDirection: "row",
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  progressBarFill: {
    flex: 0.88,
    backgroundColor: colors.color_secondary,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  progressBarRemainder: {
    flex: 0.12,
    backgroundColor: "transparent",
  },
  savingsMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  savingsMessageIcon: {
    marginRight: 8,
  },
  savingsMessage: {
    fontSize: 11,
    fontFamily: "Manrope-Medium",
    color: "#6B9E78",
    textAlign: "center",
  },
});
