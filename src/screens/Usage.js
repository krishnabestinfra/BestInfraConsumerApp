import { StyleSheet, Text, View, Pressable, ScrollView ,TouchableOpacity,ActivityIndicator} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants/colors";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import BiLogo from "../../assets/icons/Logo.svg";
import DashboardHeader from "../components/global/DashboardHeader";
import { getCachedConsumerData, backgroundSyncConsumerData } from "../utils/cacheManager";
import { fetchConsumerData, syncConsumerData } from "../services/apiService";
import { fetchTicketStats, fetchTicketsTable } from "../services/apiService";
import ConsumerGroupedBarChart from "../components/ConsumerGroupedBarChart";
import { StatusBar } from "expo-status-bar";
import Arrow from "../../assets/icons/arrow.svg";
import GroupedBarChart from "../components/GroupedBarChart";
import Meter from "../../assets/icons/meterWhite.svg";
import { GLOBAL_API_URL } from "../constants/constants";
import { getUser, getToken } from "../utils/storage";
import ConsumerDetailsBottomSheet from "../components/ConsumerDetailsBottomSheet";


const Usage = ({ navigation }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [consumerData, setConsumerData] = useState(null);
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);

  const [selectedView, setSelectedView] = useState("daily");
  const [isTableLoading, setIsTableLoading] = useState(true);
  // const { userName } = route?.params || {};
  //  const { isGuest } = route.params || {};
  const [loading, setLoading] = useState(true);

  // Bottom sheet state
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedConsumerUid, setSelectedConsumerUid] = useState(null);

  // Table data for meter status
  const meterStatusData = [
    {
      id: 1,
      eventName: "B_PH CT Open",
      occurredOn: "07/09/2025 6:15 PM",
      status: "Start",
      isActive: true
    },
    {
      id: 2,
      eventName: "B_PH CT Open",
      occurredOn: "07/09/2025 6:10 PM",
      status: "End",
      isActive: false
    },
    {
      id: 3,
      eventName: "B_PH CT Open",
      occurredOn: "07/09/2025 6:05 PM",
      status: "Start",
      isActive: false
    }
  ];

  // Fetch API data
  useEffect(() => {
    const fetchConsumerData = async () => {
      try {
        setLoading(true);

        // Get authenticated user data
        const user = await getUser();
        const token = await getToken();

        if (!user || !user.identifier) {
          console.error("No authenticated user found");
          setLoading(false);
          return;
        }

        const API_URL = `http://${GLOBAL_API_URL}:4256/api/consumers/${user.identifier}`;
        console.log("🔄 Fetching consumer data from:", API_URL);

        const response = await fetch(API_URL, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log("✅ API Response:", result);

        // Handle nested data structure
        const data = result.data || result;
        setConsumerData(data);

        console.log("📊 Consumer Data Set:", data);
      } catch (error) {
        console.error("❌ API error:", error);
        // Set fallback data
        setConsumerData({
          name: "Technific FMC",
          meterSerialNumber: "23010587",
          uniqueIdentificationNo: "BI25GMRA017",
          readingDate: "9/10/2025, 7:30:02 PM",
          totalOutstanding: 1658651.36,
          dailyConsumption: 0,
          monthlyConsumption: 194800
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConsumerData();
  }, []);

  // Load table data from API alerts
  useEffect(() => {
    const loadTableData = async () => {
      setIsTableLoading(true);
      try {
        if (consumerData && consumerData.alerts && consumerData.alerts.length > 0) {
          // Process API alerts data
          const formattedAlerts = consumerData.alerts
            .sort((a, b) => new Date(b.tamperDatetime) - new Date(a.tamperDatetime)) // Sort by date, latest first
            .map((alert, index) => ({
              id: alert.id || index + 1,
              eventName: getTamperTypeText(alert.tamperType),
              occurredOn: formatDateTime(alert.tamperDatetime),
              status: alert.tamperStatus === 1 ? "Start" : "End",
              isActive: alert.tamperStatus === 1,
            }));
          setTableData(formattedAlerts);
        } else {
          // Fallback to static data if no API alerts
          setTableData(meterStatusData);
        }
      } catch (error) {
        console.error('Error loading table data:', error);
        setTableData(meterStatusData); // Fallback to static data
      } finally {
        setIsTableLoading(false);
      }
    };

    if (consumerData) {
      loadTableData();
    }
  }, [consumerData]);

  // Helper function to map tamper type codes to readable text
  const getTamperTypeText = (tamperType) => {
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
      15: "PT Open"
    };
    return tamperTypes[tamperType] || `Tamper Type ${tamperType}`;
  };

  // Helper function to format datetime
  const formatDateTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return dateString;
    }
  };

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

  // Handle bar press from chart - navigate to dedicated table page
  const handleBarPress = useCallback((barData) => {
    console.log('📊 Bar pressed:', barData);
    navigation.navigate('ConsumerDataTable', {
      consumerData,
      loading,
      viewType: selectedView
    });
  }, [navigation, consumerData, loading, selectedView]);

  // Fetch data function
  const fetchData = async () => {
    try {
      setIsLoading(true);
      setStatsLoading(true);
      setTableLoading(true);
      const user = await getUser();

      if (user && user.identifier) {
        // Try to get cached data first for instant display
        const cachedResult = await getCachedConsumerData(user.identifier);
        if (cachedResult.success) {
          setConsumerData(cachedResult.data);
          setIsLoading(false);
        }

        // Fetch fresh data
        const result = await fetchConsumerData(user.identifier);
        if (result.success) {
          setConsumerData(result.data);
        }

        // Fetch ticket statistics
        const statsResult = await fetchTicketStats(user.identifier);
        if (statsResult.success) {
          setTicketStats(statsResult.data);
        }

        // Fetch tickets table data
        const tableResult = await fetchTicketsTable(user.identifier);
        if (tableResult.success) {
          setTableData(tableResult.data || []);
        } else {
          console.error('Failed to fetch tickets table:', tableResult.message);
          setTableData([]); // Set empty array on failure
        }

        // Background sync
        syncConsumerData(user.identifier).catch(error => {
          console.error('Background sync failed:', error);
        });
      }
    } catch (error) {
      console.error('Error fetching consumer data:', error);
    } finally {
      setIsLoading(false);
      setStatsLoading(false);
      setTableLoading(false);
    }
  };

  // Fetch consumer data with caching
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <ScrollView
      style={styles.Container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <DashboardHeader
        navigation={navigation}
        variant="usage"
        showBalance={false}
        consumerData={consumerData}
        isLoading={isLoading}
      />

      {/* <View style={{ display: "flex", alignItems: "center",marginTop: 20 }}>
        <ConsumerGroupedBarChart
          viewType="daily"
          data={consumerData}
          loading={loading}
          onBarPress={handleBarPress}
        />
      </View> */}


<View style={styles.whiteContainer}>
            <View
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexDirection: "row",
              }}
            >
              <Text style={styles.energyText}>Energy Summary</Text>
              <View style={{ display: "flex", flexDirection: "row" }}>
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
              </View>
            </View>
            <View style={styles.graphsContainer}>
              {selectedView === "daily" ? (
                <>
                  <Text style={styles.thismonthText}>
                    Today's Usage: <Text style={styles.kwhText}>
                      {loading ? "Loading..." : getDailyUsage()}kWh
                    </Text>
                  </Text>
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      marginTop: 10,
                    }}
                  >
                    <View style={styles.tenPercentageTextContainer}>
                      <Text style={styles.percentText}>5%</Text>
                      <Arrow width={12} height={12} fill="#55B56C" />
                    </View>
                    <Text style={styles.lastText}>Yesterday.</Text>
                  </View>
                  <View style={{ display: "flex", alignItems: "center" }}>
                    <ConsumerGroupedBarChart 
                      viewType="daily" 
                      data={consumerData}
                      loading={loading}
                      onBarPress={handleBarPress}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.thismonthText}>
                    This Month's Usage: <Text style={styles.kwhText}>
                      {loading ? "Loading..." : getMonthlyUsage()}kWh
                    </Text>
                  </Text>
                  <View
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      marginTop: 10,
                    }}
                  >
                    <View style={styles.tenPercentageTextContainer}>
                      <Text style={styles.percentText}>10%</Text>
                      <Arrow width={12} height={12} fill="#55B56C" />
                    </View>
                    <Text style={styles.lastText}>Last Month.</Text>
                  </View>
                  <View style={{ display: "flex", alignItems: "center" }}>
                    <ConsumerGroupedBarChart 
                      viewType="monthly" 
                      data={consumerData}
                      loading={loading}
                      onBarPress={handleBarPress}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
    </ScrollView>
  );
};

export default Usage;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  whiteContainer: {
    padding: 10,
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
    display: "flex",
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
  separator: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    marginHorizontal: 5,
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
  },
  TopMenu: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    verticalAlign: "middle",
    justifyContent: "center",
    // Android shadow
    elevation: 5,
  },
  logoImage: {},
  logo: {
    width: 80,
    height: 80,
    zIndex: 1,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    verticalAlign: "middle",
    justifyContent: "center",
    elevation: 5,
  },
  ProfileBox: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row",
    marginHorizontal: 4,
  },
  textContainer: {},
  usageText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 16,
    textAlign: "center",
    marginTop: 30,
  },
});
