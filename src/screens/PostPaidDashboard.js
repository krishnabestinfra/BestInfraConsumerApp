import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import Arrow from "../../assets/icons/arrow.svg";
import GroupedBarChart from "../components/GroupedBarChart";
import ConsumerGroupedBarChart from "../components/ConsumerGroupedBarChart";
import Table from "../components/global/Table";
import Input from "../components/global/Input";
import DatePicker from "../components/global/DatePicker";
import Meter from "../../assets/icons/meterWhite.svg";
import DashboardHeader from "../components/global/DashboardHeader";
import LastCommunicationIcon from "../../assets/icons/signal.svg";
import { API, API_ENDPOINTS } from "../constants/constants";
import { getUser, getToken } from "../utils/storage";
import ConsumerDetailsBottomSheet from "../components/ConsumerDetailsBottomSheet";
import { useLoading, SkeletonLoader } from '../utils/loadingManager';
import { showSuccess, showError } from '../components/global/Toastify';
import { apiClient } from '../services/apiClient';

// import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Dynamic API URL will be set based on authenticated user

const PostPaidDashboard = ({ navigation, route }) => {
  const [selectedView, setSelectedView] = useState("daily");
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

  // Table data for meter status
  const meterStatusData = [
    {
      id: 1,
      eventName: "B_PH CT Open",
      description: "Current transformer circuit opened on B phase",
      occurredOn: "07/09/2025 6:15 PM",
      status: "Start",
      isActive: true
    },
    {
      id: 2,
      eventName: "B_PH CT Open",
      description: "Current transformer circuit opened on B phase",
      occurredOn: "07/09/2025 6:10 PM",
      status: "End",
      isActive: false
    },
    {
      id: 3,
      eventName: "B_PH CT Open",
      description: "Current transformer circuit opened on B phase",
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
          showSuccess("Data fetched Successfully");
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
        } else if (error.message.includes('timeout')) {
          errorMessage = "Request timeout - please try again";
        } else if (error.message.includes('Network error')) {
          errorMessage = "Network error - please check your connection";
        }
        
        showError(errorMessage);
        
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
              description: getTamperTypeDescription(alert.tamperType),
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
      15: "PT Open",
      24: "Tamper Type 24",
      25: "Tamper Type 25"
    };
    return tamperTypes[tamperType] || `Tamper Type ${tamperType}`;
  };

  // Helper function to get tamper type description
  const getTamperTypeDescription = (tamperType) => {
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

  // Handle bar press from chart - navigate to dedicated table page
  const handleBarPress = useCallback((barData) => {
    console.log('📊 Bar pressed:', barData);
    navigation.navigate('ConsumerDataTable', {
      consumerData,
      loading: isLoading,
      viewType: selectedView
    });
  }, [navigation, consumerData, isLoading, selectedView]);

  return (
    <>
      <ScrollView
        style={styles.Container}
        contentContainerStyle={{ paddingBottom: 30 }}
        showsVerticalScrollIndicator={false}
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
                <View style={styles.lastCommunicationLeft}>
                  <LastCommunicationIcon width={15} height={10} style={{ marginRight: 5 }} />
                  <Text style={styles.lastCommunicationText}>Last Communication</Text>
                </View>
                <Text style={styles.lastCommunicationTimeText}>
                {consumerData?.readingDate ? (consumerData.readingDate) : "Loading..."}
              </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.lastCommunicationContainer}>
                <Text style={styles.meterUIDText}>
                  UID: {consumerData?.uniqueIdentificationNo || "Loading..."}
                </Text>
            </View>
          </View>

          <View style={styles.graphSection}>
            <View
              style={{                justifyContent: "space-between",
    flexDirection: "row",
              }}
            >
              <Text style={styles.energyText}>Energy Summary</Text>
              <View style={{ flexDirection: "row" }}>
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
                <Text style={styles.separator}>{' / '}</Text>
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

            <View style={styles.graphsContainer}>
              {selectedView === "daily" ? (
                <>
                  <Text style={styles.thismonthText}>
                    Today's Usage: <Text style={styles.kwhText}>
                      {isLoading ? "Loading..." : getDailyUsage()}kWh
                    </Text>
                  </Text>
                  <View
                    style={{                      flexDirection: "row",
                      marginTop: 10,
                    }}
                  >
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
                    <Text style={styles.lastText}>Yesterday.</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    {isLoading ? (
                      <SkeletonLoader variant="barchart" style={{ marginVertical: 20 }} lines={10} />
                    ) : (
                      <ConsumerGroupedBarChart
                        viewType="daily"
                        data={consumerData}
                        loading={isLoading}
                        onBarPress={handleBarPress}
                      />
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.thismonthText}>
                    This Month's Usage: <Text style={styles.kwhText}>
                      {isLoading ? "Loading..." : getMonthlyUsage()}kWh
                    </Text>
                  </Text>
                  <View
                    style={{                      flexDirection: "row",
                      marginTop: 10,
                    }}
                  >
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
                    <Text style={styles.lastText}>Last Month.</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    {isLoading ? (
                      <SkeletonLoader variant="barchart" style={{ marginVertical: 20 }} lines={12} />
                    ) : (
                      <ConsumerGroupedBarChart
                        viewType="monthly"
                        data={consumerData}
                        loading={isLoading}
                        onBarPress={handleBarPress}
                      />
                    )}
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
            skeletonLines={5}
            emptyMessage={consumerData?.alerts?.length === 0 ? "No tamper alerts available" : "No meter status data available"}
            showSerial={true}
            showPriority={false}
            priorityField="occurredOn"
            priorityMapping={{
              "Cover Tamper": "high",
              "CT Open": "high",
              "Magnetic Tamper": "medium",
              "Reverse Current": "high"
            }}
            columns={[
              { key: 'eventName', title: 'Name', flex: 1 },
              { key: 'description', title: 'Description', flex: 2 },
              { key: 'occurredOn', title: 'Occurred On', flex: 2 },
              { key: 'status', title: 'Status', flex: 1 }
            ]}
          />
        </View>
      </ScrollView>

      {/* Consumer Details Bottom Sheet */}
      <ConsumerDetailsBottomSheet
        visible={bottomSheetVisible}
        consumerUid={selectedConsumerUid}
        onClose={handleBottomSheetClose}
      />
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
    fontFamily: "Manrope-Medium",
  },
  monthlyText: {
    color: COLORS.secondaryColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
  },
  separator: {
    // color: COLORS.primaryFontColor,
    // fontSize: 12,
    // fontFamily: "Manrope-Regular",
    // marginHorizontal: 5,
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
    // justifyContent: "flex-start",
    flex: 1,
    paddingVertical: 22
  },

  tapIndicator: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
  },

  tapIndicatorText: {
    fontSize: 7,
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
  },
  lastCommunicationTimeText: {
    color: COLORS.secondaryFontColor,
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
  tableContainer: {
    paddingHorizontal: 16,
  },
  tableTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
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
  }
});
