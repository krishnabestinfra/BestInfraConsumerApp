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
import React, { useEffect, useState, useCallback, useRef } from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS, colors } from "../constants/colors";
import Arrow from "../../assets/icons/arrow.svg";
import GroupedBarChart from "../components/GroupedBarChart";
import ConsumerGroupedBarChart from "../components/ConsumerGroupedBarChart";
import Table from "../components/global/Table";
import Input from "../components/global/Input";
import DatePicker from "../components/global/DatePicker";
import Meter from "../../assets/icons/meterWhite.svg";
import DashboardHeader from "../components/global/DashboardHeader";
import BottomNavigation from "../components/global/BottomNavigation";
import LastCommunicationIcon from "../../assets/icons/signal.svg";
import EyeIcon from "../../assets/icons/eyeFill.svg";
import { API, API_ENDPOINTS } from "../constants/constants";
import { getUser, getToken } from "../utils/storage";
import ConsumerDetailsBottomSheet from "../components/ConsumerDetailsBottomSheet";
import { useLoading, SkeletonLoader } from '../utils/loadingManager';
import { apiClient } from '../services/apiClient';
import SwitchIcon from "../../assets/icons/switch.svg";
import DropdownIcon from "../../assets/icons/dropDown.svg";

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

const PostPaidDashboard = ({ navigation, route }) => {
  const [selectedView, setSelectedView] = useState("daily");
  const [displayMode, setDisplayMode] = useState("chart"); // "chart" or "table"
  const [showViewDropdown, setShowViewDropdown] = useState(false);
  const [timePeriod, setTimePeriod] = useState("30D");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tableData, setTableData] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  // const { userName } = route?.params || {};
  //  const { isGuest } = route.params || {};
  const [consumerData, setConsumerData] = useState(null);
  const { isLoading, setLoading } = useLoading('consumerData', true);

  // Bottom sheet state
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedConsumerUid, setSelectedConsumerUid] = useState(null);

  // Fetch API data
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
    if (!value) {
      return "--";
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return parsedDate.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, []);

  const formatDuration = useCallback((durationValue) => {
    if (typeof durationValue === "string" && durationValue.trim().length > 0) {
      return durationValue;
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
  const formatReadingDate = useCallback((dateString) => {
    if (!dateString) return "Loading...";
    
    try {
      // Remove seconds from timestamp (format: "23rd Jan 2026 04:45:01 AM" -> "23rd Jan 2026 04:45 AM")
      // Pattern: match "HH:MM:SS" and replace with "HH:MM"
      return dateString.replace(/(\d{1,2}:\d{2}):\d{2}/g, '$1');
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

  // Helper function to get monthly usage from chart data
  const getMonthlyUsage = () => {
    if (!consumerData?.chartData?.monthly?.seriesData?.[0]?.data) return 0;
    const monthlyData = consumerData.chartData.monthly.seriesData[0].data;
    return monthlyData[monthlyData.length - 1] || 0; // Get last value
  };

  // Transform chart data into table format
  const getConsumptionTableData = useCallback(() => {
    if (!consumerData?.chartData) return [];

    const chartType = selectedView === "daily" 
      ? consumerData.chartData.daily 
      : consumerData.chartData.monthly;

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

    // Transform to table rows
    return labels.map((label, index) => ({
      id: index + 1,
      period: label,
      consumption: consumptions[index] || 0,
      cumulative: data[index] || 0,
    })).reverse(); // Show latest first
  }, [consumerData, selectedView]);

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

      // Validate the date
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

  return (
    <>
      <ScrollView
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchConsumerData}
            colors={[COLORS.secondaryColor]}
            tintColor={COLORS.secondaryColor}
          />
        }
      >
        <View style={styles.Container}>
          <StatusBar style="dark" />
          <DashboardHeader
            navigation={navigation}
            showBalance={false}
            consumerData={consumerData}
            isLoading={isLoading}
          />

          <View style={styles.meterContainer}>
            <TouchableOpacity
              style={styles.meterInfoContainer}
              onPress={handleConsumerPress}
            >
              {/* Left side container */}
              <View style={styles.leftContainer}>
                <View style={styles.meterInfoRow}>
                  <Meter width={30} height={30} style={{ marginTop: 5 }} />
                  <View style={styles.meterConsumerRow}>
                    <Text style={styles.meterConsumerText}>
                      {consumerData?.name || consumerData?.consumerName || "Loading..."}
                    </Text>
                  <Text style={styles.meterNumberText}>
                    Meter SL No: {consumerData?.meterSerialNumber || "Loading..."}
                  </Text>
                  </View>
                </View>
              </View>

              {/* Right side container */}
              <View style={styles.rightContainer}>
                <View style={styles.tapIndicator}>
                  <Text style={styles.tapIndicatorText}>Tap for details</Text>
                </View>
                <View>
                <View style={styles.lastCommunicationLeft}>
                  <LastCommunicationIcon width={15} height={10} style={{ marginRight: 5 }} />
                  <Text style={styles.lastCommunicationText}>Last Communication</Text>
                </View>
                <Text style={styles.lastCommunicationTimeText}>
                {formatReadingDate(consumerData?.readingDate)}
              </Text>
                </View>
                
              </View>
            </TouchableOpacity>
            <View style={styles.lastCommunicationContainer}>
                <Text style={styles.meterUIDText}>
                  UID: {consumerData?.uniqueIdentificationNo || "Loading..."}
                </Text>
            </View>
          </View>

          <View style={styles.graphSection}>
            <View style={styles.energySummaryHeader}>
              <Text style={styles.energyText}>Energy Summary</Text>
              {/* Daily/Monthly Toggle - Button Style */}
              <View style={styles.textToggleContainer}>
                <Text style={styles.toggleText}>
                  <Text
                    style={[
                      styles.toggleTextItem,
                      selectedView === "daily" && styles.toggleTextSelected
                    ]}
                    onPress={() => setSelectedView("daily")}
                  >
                    Daily
                  </Text>
                  <Text style={styles.toggleSeparator}> / </Text>
                  <Text
                    style={[
                      styles.toggleTextItem,
                      selectedView === "monthly" && styles.toggleTextSelected
                    ]}
                    onPress={() => setSelectedView("monthly")}
                  >
                    Monthly
                  </Text>
                </Text>
              </View>
            </View>

            {/* <View style={styles.datePickerSection}>
              <DatePicker
                placeholder="Start Date"
                value={startDate}
                onChange={setStartDate}
              />
              <DatePicker
                placeholder="End Date"
                value={endDate}
                onChange={setEndDate}
              />
            </View> */}

            <View style={styles.graphsContainer}>
              {/* Summary Header row: usage + % on left, Chart/Table dropdown on right */}
              <View style={styles.usageSummaryRow}>
                <View style={styles.usageSummaryLeft}>
                  {selectedView === "daily" ? (
                    <>
                      <Text style={styles.thismonthText}>
                        Today's Usage: <Text style={styles.kwhText}>
                          {isLoading ? "Loading..." : getDailyUsage()} kWh
                        </Text>
                      </Text>
                      <View style={styles.percentRow}>
                        <View style={[
                          styles.tenPercentageTextContainer,
                          getDailyTrendPercentage() < 0 && styles.negativeTrendContainer
                        ]}>
                          <Text style={styles.percentText}>
                            {isLoading ? "..." : `${Math.abs(getDailyTrendPercentage())}%`}
                          </Text>
                          <Arrow 
                            width={12} 
                            height={12} 
                            fill={getDailyTrendPercentage() >= 0 ? "#55B56C" : "#FF6B6B"} 
                            style={getDailyTrendPercentage() < 0 ? { transform: [{ rotate: '180deg' }] } : {}}
                          />
                        </View>
                        <Text style={styles.lastText}>vs Yesterday.</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.thismonthText}>
                        This Month's Usage: <Text style={styles.kwhText}>
                          {isLoading ? "Loading..." : getMonthlyUsage()} kWh
                        </Text>
                      </Text>
                      <View style={styles.percentRow}>
                        <View style={[
                          styles.tenPercentageTextContainer,
                          getMonthlyTrendPercentage() < 0 && styles.negativeTrendContainer
                        ]}>
                          <Text style={styles.percentText}>
                            {isLoading ? "..." : `${Math.abs(getMonthlyTrendPercentage())}%`}
                          </Text>
                          <Arrow 
                            width={12} 
                            height={12} 
                            fill={getMonthlyTrendPercentage() >= 0 ? "#55B56C" : "#FF6B6B"} 
                            style={getMonthlyTrendPercentage() < 0 ? { transform: [{ rotate: '180deg' }] } : {}}
                          />
                        </View>
                        <Text style={styles.lastText}>vs Last Month.</Text>
                      </View>
                    </>
                  )}
                </View>
                {/* Chart/Table Dropdown - green button with chevron */}
                <View style={styles.viewDropdownWrapper}>
                  <TouchableOpacity
                    style={styles.viewDropdownButton}
                    onPress={() => setShowViewDropdown(!showViewDropdown)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewDropdownButtonText}>
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
                          style={styles.viewDropdownContent}
                          onPress={() => {}}
                        >
                          {VIEW_OPTIONS.map((option) => (
                            <Pressable
                              key={option}
                              style={[
                                styles.viewDropdownItem,
                                (displayMode === option.toLowerCase() && styles.viewDropdownItemSelected)
                              ]}
                              onPress={() => {
                                setDisplayMode(option.toLowerCase());
                                setShowViewDropdown(false);
                              }}
                            >
                              <Text style={[
                                styles.viewDropdownItemText,
                                displayMode === option.toLowerCase() && styles.viewDropdownItemTextSelected
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

              {/* Time period selector: 7D, 30D, 90D, 1Y */}
              <View style={styles.timePeriodRow}>
                {TIME_PERIODS.map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.timePeriodButton,
                      timePeriod === period && styles.timePeriodButtonActive
                    ]}
                    onPress={() => setTimePeriod(period)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.timePeriodButtonText,
                      timePeriod === period && styles.timePeriodButtonTextActive
                    ]}>
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chart or Table View */}
              {displayMode === "chart" ? (
                <View style={{ alignItems: "center", marginTop: 15 }}>
                  {isLoading ? (
                    <SkeletonLoader variant="barchart" style={{ marginVertical: 20 }} lines={selectedView === "daily" ? 10 : 12} />
                  ) : (
                    <ConsumerGroupedBarChart
                      viewType={selectedView}
                      timePeriod={timePeriod}
                      data={consumerData}
                      loading={isLoading}
                      onBarPress={handleBarPress}
                    />
                  )}
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  {isLoading ? (
                    <SkeletonLoader variant="table" style={{ marginVertical: 20 }} lines={5} columns={3} />
                  ) : (
                    <Table
                      data={getConsumptionTableData()}
                      loading={isLoading}
                      emptyMessage={`No ${selectedView} consumption data available`}
                      showSerial={true}
                      showPriority={false}
                      containerStyle={styles.consumptionTable}
                      columns={[
                        { 
                          key: 'period', 
                          title: selectedView === "daily" ? 'Date' : 'Month', 
                          flex: 1.5,
                          align: 'left'
                        },
                        { 
                          key: 'consumption', 
                          title: 'Consumption (kWh)', 
                          flex: 1.5,
                          align: 'right',
                          render: (item) => (
                            <Text style={styles.consumptionValue}>
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
                            <Text style={styles.cumulativeValue}>
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
          {/* Usage Statistics Section */}
          <View style={styles.usageStatsContainer}>
            {/* Top Row - Two Cards */}
            <View style={styles.usageStatsTopRow}>
              {/* Average Daily Card */}
              <View style={styles.usageStatsCard}>
                <Text style={styles.usageStatsCardTitle}>Average Daily</Text>
                <Text style={styles.usageStatsCardValueBlue}>284 kWh</Text>
              </View>
              
              {/* Peak Usage Card */}
              <View style={styles.usageStatsCard}>
                <Text style={styles.usageStatsCardTitle}>Peak Usage</Text>
                <Text style={styles.usageStatsCardValueRed}>329 kWh</Text>
              </View>
            </View>
            
            {/* Bottom Row - Comparison Card */}
            <View style={styles.comparisonCard}>
              {/* Comparison Header */}
              <View style={styles.comparisonHeader}>
                <View style={styles.doubleArrowIcon}>
                  <SwitchIcon width={20} height={20} />
                </View>
                <Text style={styles.comparisonTitle}>Comparison</Text>
              </View>
              
              {/* Monthly Values */}
              <View style={styles.monthlyValuesContainer}>
                <View style={styles.monthlyValueItem}>
                  <Text style={styles.monthlyValueLabel}>This Month</Text>
                  <Text style={styles.monthlyValueBlue}>2,060 kWh</Text>
                </View>
                <View style={styles.monthlyValueItem}>
                  <Text style={styles.monthlyValueLabel}>Last Month</Text>
                  <Text style={styles.monthlyValueGrey}>2,340 kWh</Text>
                </View>
              </View>
              
              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBar}>
                  <View style={styles.progressBarFill} />
                  <View style={styles.progressBarRemainder} />
                </View>
              </View>
              
              {/* Savings Message */}
              <Text style={styles.savingsMessage}>You saved 280 kWh compared to last month</Text>
            </View>
          </View>
          <View style={styles.tableContainer}>
            <Text style={styles.tableTitle}>Alerts</Text>
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
                          <Text style={styles.meterSiText}>{item.meterSerialNumber}</Text>
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
      </ScrollView>

      {/* Consumer Details Bottom Sheet */}
      <ConsumerDetailsBottomSheet
        visible={bottomSheetVisible}
        consumerUid={selectedConsumerUid}
        onClose={handleBottomSheetClose}
      />
      
      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} />
    </>
  );
};

export default PostPaidDashboard;

const styles = StyleSheet.create({
  Container: {
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
  separator: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    marginHorizontal: 4,
    paddingVertical: 4,
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
    marginTop: 10,
    borderRadius: 5,
    paddingBottom: 5,
  },
  usageSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  usageSummaryLeft: {
    flex: 1,
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
    borderRadius: 6,
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
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 120,
    paddingRight: 24,
  },
  viewDropdownContent: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 8,
    minWidth: 140,
    borderWidth: 1,
    borderColor: "#F1F3F4",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  viewDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  viewDropdownItemSelected: {
    backgroundColor: "#E8F5E9",
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
    width: 60,
    borderRadius: 20,
    height: 19,
    // padding: 1.5,
  },
  percentText: {
    color: COLORS.secondaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-SemiBold",
    marginRight: 5,
  },
  lastText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    marginLeft: 10,
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
  meterContainer: {
    padding: 16,
    paddingBottom: 0,
    // backgroundColor:"red"
  },
  meterInfoContainer: {
    backgroundColor: COLORS.primaryColor,
    borderRadius: 5,
    paddingVertical: 2,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 90,
  },


  leftContainer: {
    flexDirection: "column",
    justifyContent: "flex-start",
    flex: 1,
    marginRight: 10,
  },
  meterInfoRow: {    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 10,
  },
  meterConsumerRow: {    flexDirection: "column",
    justifyContent: "flex-start",
    gap: 5,
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
    fontFamily: "Manrope-Regular",
  },

  rightContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flex: 1,
    // paddingVertical: 22
    // backgroundColor: "red",
    height: 60,
    justifyContent: "space-between",
  },

  tapIndicator: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
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
  // Usage Statistics Styles
  usageStatsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  usageStatsTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  usageStatsCard: {
    flex: 1,
    backgroundColor: "#eef8f0",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F3F4",
  },
  usageStatsCardTitle: {
    fontSize: 14,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
    marginBottom: 8,
  },
  usageStatsCardValueBlue: {
    fontSize: 24,
    fontFamily: "Manrope-Bold",
    color: colors.color_brand_blue,
    lineHeight: 28,
  },
  usageStatsCardValueRed: {
    fontSize: 24,
    fontFamily: "Manrope-Bold",
    color: colors.color_danger,
    lineHeight: 28,
  },
  comparisonCard: {
    backgroundColor: "#eef8f0",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F3F4",
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
    fontSize: 14,
    fontFamily: "Manrope-Medium",
    color: COLORS.primaryFontColor,
  },
  monthlyValuesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthlyValueItem: {
    flex: 1,
  },
  monthlyValueLabel: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    marginBottom: 4,
  },
  monthlyValueBlue: {
    fontSize: 24,
    fontFamily: "Manrope-Bold",
    color: colors.color_brand_blue,
    lineHeight: 28,
  },
  monthlyValueGrey: {
    fontSize: 24,
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
  },
  progressBarFill: {
    flex: 0.88,
    backgroundColor: colors.color_secondary,
    borderRadius: 4,
  },
  progressBarRemainder: {
    flex: 0.12,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
  },
  savingsMessage: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "#6B9E78",
    marginTop: 4,
  },
});
