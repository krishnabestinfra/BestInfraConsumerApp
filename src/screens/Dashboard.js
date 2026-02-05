import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import Arrow from "../../assets/icons/arrow.svg";
import GroupedBarChart from "../components/GroupedBarChart";
import DashboardHeader from "../components/global/DashboardHeader";
import Table from "../components/global/Table";
import DatePicker from "../components/global/DatePicker";
import Meter from "../../assets/icons/meterWhite.svg";
import LastCommunicationIcon from "../../assets/icons/signal.svg";
import EyeIcon from "../../assets/icons/eyeFill.svg";
import { fetchConsumerData, syncConsumerData } from "../services/apiService";
import { getUser } from "../utils/storage";
import { getCachedConsumerData } from "../utils/cacheManager";
import { cacheManager } from "../utils/cacheManager";
import { useLoading } from "../utils/loadingManager";
import { InstantLoader } from "../utils/loadingManager";
import { useUltraFastData } from "../hooks/useUltraFastData";
import UltraFastScreen from "../components/UltraFastScreen";



const Dashboard = React.memo(({ navigation, route }) => {
  const { isDark, colors: themeColors } = useTheme();
  const [selectedView, setSelectedView] = useState("daily");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tableData, setTableData] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);
  const [tableError, setTableError] = useState(null);
  const [consumerData, setConsumerData] = useState(null);
  const { isLoading, setLoading } = useLoading('dashboard_loading', true);
  
  // Ultra-fast data loading
  const { data: ultraFastData, isLoading: ultraFastLoading, refresh: ultraFastRefresh } = useUltraFastData('consumerData', {
    maxLoadingTime: 500,
    autoRefresh: true
  });

  // Fetch consumer data with caching
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const user = await getUser();
      
      if (user && user.identifier) {
        // Check preloaded data first (ultra-fast)
        const preloadedData = await cacheManager.getCachedData('consumer_data', user.identifier);
        if (preloadedData.success) {
          setConsumerData(preloadedData.data);
          setLoading(false, 50);
          console.log('⚡ Dashboard: Using preloaded data');
        } else {
          // Try cached data
          const cachedResult = await getCachedConsumerData(user.identifier);
          if (cachedResult.success) {
            setConsumerData(cachedResult.data);
            setLoading(false, 100);
            console.log('⚡ Dashboard: Using cached data');
          }
        }
        
        // Fetch fresh data (will use cache if available, otherwise fetch from API)
        const result = await fetchConsumerData(user.identifier);
        if (result.success) {
          setConsumerData(result.data);
        }
        
        // Background sync for future updates
        syncConsumerData(user.identifier).then((syncResult) => {
          if (syncResult.success) {
            setConsumerData(syncResult.data);
          }
        }).catch(error => {
          console.error('Background sync failed:', error);
        });
      }
    } catch (error) {
      console.error('Error fetching consumer data:', error);
    } finally {
      setLoading(false, 50);
    }
  }, [setLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const mapTamperEvents = useCallback((rawData = [], consumerName = "") => {
    if (!Array.isArray(rawData)) {
      return [];
    }

    return rawData.map((event, index) => {
      const durationValue =
        event?.duration ??
        event?.durationMinutes ??
        event?.durationInMinutes ??
        event?.durationInMins ??
        event?.durationSeconds;

      return {
        id: event?.id || event?.eventId || `tamper-event-${index}`,
        meterSerialNumber:
          event?.meterSerialNumber ||
          event?.meterNumber ||
          event?.meterSlNo ||
          event?.meterSI ||
          event?.meterSerial ||
          "--",
        consumerName:
          event?.consumerName ||
          event?.consumer?.name ||
          event?.consumer_name ||
          consumerName ||
          "--",
        eventDateTime: formatEventDateTime(
          event?.eventDateTime ||
            event?.eventDate ||
            event?.occurredOn ||
            event?.tamperDatetime ||
            event?.eventTimestamp
        ),
        eventDescription:
          event?.eventDescription || 
          event?.tamperTypeDesc || 
          event?.eventName || 
          event?.description || 
          "--",
        status: formatStatus(event?.status || event?.eventStatus || event?.state),
        duration: formatDuration(durationValue || event?.durationText),
        raw: event,
      };
    });
  }, [formatDuration, formatEventDateTime, formatStatus]);

  const loadConsumerAlerts = useCallback(() => {
    setIsTableLoading(true);
    setTableError(null);
    try {
      if (consumerData && consumerData.alerts && Array.isArray(consumerData.alerts)) {
        const alerts = consumerData.alerts;
        const consumerName = consumerData.name || "";
        setTableData(mapTamperEvents(alerts, consumerName));
        setTableError(null);
      } else {
        setTableData([]);
        setTableError("No alerts available for this consumer");
      }
    } catch (error) {
      console.error("Error loading consumer alerts:", error);
      setTableError(error.message);
      setTableData([]);
    } finally {
      setIsTableLoading(false);
    }
  }, [consumerData, mapTamperEvents]);

  useEffect(() => {
    if (consumerData) {
      loadConsumerAlerts();
    }
  }, [consumerData, loadConsumerAlerts]);

  const handleRefresh = useCallback(async () => {
    await fetchData();
    // loadConsumerAlerts will be triggered by the consumerData useEffect
  }, [fetchData]);

  const handleViewTamperEvent = useCallback((event) => {
    console.log("🔎 View tamper event", event?.raw || event);
  }, []);
  return (
    <InstantLoader dataKey="dashboard_data" onDataReady={(data) => setConsumerData(data.data)}>
      <ScrollView
        style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            colors={[COLORS.secondaryColor]}
            tintColor={COLORS.secondaryColor}
          />
        }
      >
        <View style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <DashboardHeader 
            navigation={navigation} 
            showBalance={false}
            consumerData={consumerData}
            isLoading={isLoading}
          />

        <View style={[styles.contentOnTop, isDark && { backgroundColor: themeColors.screen }]}>
        <View style={styles.meterContainer}>
          <View style={styles.meterInfoContainer}>
          <View style={styles.meterInfoRow}>
            <Meter width={30} height={30} />
            <Text style={styles.meterConsumerText}>
              {consumerData?.name || "GMR AERO TOWER 2 INCOMER"}
            </Text>
          </View>
           <View style={styles.meterInfoColumn}>
           <Text style={styles.meterNumberText}>Meter SL No</Text>
           <Text style={styles.meterNumberText}>18132429</Text>
            <Text style={styles.meterUIDText}>UID: BI25GMRA014</Text>
           </View>
 
          </View>
          <View style={styles.lastCommunicationContainer}>
            <View style={styles.lastCommunicationLeft}>
             <LastCommunicationIcon width={15} height={10} style={{ marginRight: 5 }} />
             <Text style={styles.lastCommunicationText}>Last Communication</Text>
            </View>
            <Text style={styles.lastCommunicationTimeText}>07/09/2025 6:35 PM</Text>
            </View>
        </View>

        <View style={[styles.whiteContainer, isDark && { backgroundColor: themeColors.screen }]}>
          <View style={styles.energyHeader}>
            <Text style={styles.energyText}>Energy Summary</Text>
            <View style={styles.toggleContainer}>
              <TouchableOpacity onPress={() => setSelectedView("daily")}>
                <Text
                  style={
                    selectedView === "daily"
                      ? styles.monthlyText
                      : styles.dailyText
                  }
                >
                  Daily
                </Text>
              </TouchableOpacity>
              <Text> / </Text>
              <TouchableOpacity onPress={() => setSelectedView("monthly")}>
                <Text
                  style={
                    selectedView === "monthly"
                      ? styles.monthlyText
                      : styles.dailyText
                  }
                >
                  Monthly
                </Text>
              </TouchableOpacity>
              {/* <Text> / </Text>
              <TouchableOpacity onPress={() => setSelectedView("monthly")}>
                <Text
                  style={
                    selectedView === "monthly"
                      ? styles.monthlyText
                      : styles.dailyText
                  }
                >
                  Pick Date
                </Text>
              </TouchableOpacity> */}
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

          <View style={[styles.graphsContainer, isDark && { backgroundColor: themeColors.card }]}>
            {selectedView === "daily" ? (
              <>
                <Text style={styles.thismonthText}>
                  Today's Usage: <Text style={styles.kwhText}>20kWh</Text>
                </Text>
                <View style={styles.percentageContainer}>
                  <View style={styles.tenPercentageTextContainer}>
                    <Text style={styles.percentText}>5%</Text>
                    <Arrow width={12} height={12} fill="#55B56C" />
                  </View>
                  <Text style={styles.lastText}>Yesterday.</Text>
                </View>
                <View style={styles.chartContainer}>
                  <GroupedBarChart viewType="daily" />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.thismonthText}>
                  This Month's Usage: <Text style={styles.kwhText}>620kWh</Text>
                </Text>
                <View style={styles.percentageContainer}>
                  <View style={styles.tenPercentageTextContainer}>
                    <Text style={styles.percentText}>10%</Text>
                    <Arrow width={12} height={12} fill="#55B56C" />
                  </View>
                  <Text style={styles.lastText}>Last Month.</Text>
                </View>
                <View style={styles.chartContainer}>
                  <GroupedBarChart viewType="monthly" />
                </View>
              </>
            )}
          </View>
        </View>
        <View style={styles.tableContainer}>
          <Text style={styles.tableTitle}>Alerts</Text>
          </View>
        <Table 
          data={tableData}
          loading={isTableLoading}
          skeletonLines={3}
          emptyMessage={tableError || "No alerts available"}
          showSerial={true}
          showPriority={false}
          minTableWidth={920}
          columns={[
            { key: 'meterSerialNumber', title: 'Meter SI No', width: 140 },
            { key: 'consumerName', title: 'Consumer Name', width: 190 },
            { key: 'eventDateTime', title: 'Event Date Time', width: 190 },
            { key: 'eventDescription', title: 'Event Description', width: 200 },
            { 
              key: 'status', 
              title: 'Status', 
              width: 120,
              align: 'center',
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
            { key: 'duration', title: 'Duration', width: 110 },
            {
              key: 'actions',
              title: 'Actions',
              width: 90,
              align: 'center',
              render: (item) => (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleViewTamperEvent(item)}
                  accessibilityRole="button"
                  accessibilityLabel="View tamper event details"
                >
                  <EyeIcon width={18} height={18} />
                </TouchableOpacity>
              )
            }
          ]}
        />
        
      </View>
        </View>
    </ScrollView>
    </InstantLoader>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
  },
  contentOnTop: {
    zIndex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    elevation: 2,
  },
  whiteContainer: {
    // padding: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  energyText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    marginBottom: 10,
  },
  dailyText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
  },
  monthlyText: {
    color: COLORS.secondaryColor,
    fontSize: 12,
    fontFamily: "Manrope-Bold",
  },
  graphsContainer: {
    backgroundColor: "#eef8f0",
    paddingHorizontal: 15,
    paddingTop: 15,
    marginTop: 10,
    borderRadius: 5,
    paddingBottom: 5,
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

  meterContainer:{
    padding: 10
  },
  meterInfoContainer:{
    backgroundColor: COLORS.primaryColor,
    borderRadius: 5,
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastCommunicationContainer:{
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
  color: COLORS.primaryFontColor,
  fontSize: 10,
  fontFamily: "Manrope-Regular",
},
lastCommunicationTimeText: {
  color: COLORS.primaryFontColor,
  fontSize: 10,
  fontFamily: "Manrope-Regular",
},

  meterConsumerText:{
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Bold",
  },
  meterNumberText:{
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Bold",
  },
  meterUIDText:{
    color: '#E9EAEE',
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  lastCommunicationText:{
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  lastCommunicationTimeText:{
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
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
  meterInfoRow: {    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "50%"
  },
  meterInfoColumn: {    flexDirection: "column",
    alignItems: "flex-end"
  },
  energyHeader: {    justifyContent: "space-between",
    flexDirection: "row",
  },
  toggleContainer: {    flexDirection: "row"
  },
  percentageContainer: {    flexDirection: "row",
    marginTop: 10,
  },
  chartContainer: {    alignItems: "center"
  },
  tableContainer: {
    paddingHorizontal: 20,
  },
  tableTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  statusBadgeText: {
    fontFamily: "Manrope-SemiBold",
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
});
