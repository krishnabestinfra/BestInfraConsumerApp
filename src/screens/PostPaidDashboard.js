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
  import Table from "../components/global/Table";
  import Input from "../components/global/Input";
  import DatePicker from "../components/global/DatePicker";
  import Meter from "../../assets/icons/meterWhite.svg";
import DashboardHeader from "../components/global/DashboardHeader";
  import LastCommunicationIcon from "../../assets/icons/signal.svg";
import { GLOBAL_API_URL } from "../constants/constants";
import { getUser, getToken } from "../utils/storage";
import ConsumerDetailsBottomSheet from "../components/ConsumerDetailsBottomSheet";
import { useLoading, SkeletonLoader } from '../utils/loadingManager';

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
            {isLoading ? (
              <SkeletonLoader lines={4} showAvatar={true} style={{ margin: 16 }} />
            ) : (
              consumerData && (
                <>
                  <TouchableOpacity 
                    style={styles.meterInfoContainer}
                    onPress={handleConsumerPress}
                    // activeOpacity={0.7}
                  >
                    <View style={{display: "flex", flexDirection: "row", alignItems: "center", gap: 10, width: "50%"}}>
                      <Meter width={30} height={30} />
                      <Text style={styles.meterConsumerText}>
                        {consumerData.name || consumerData.consumerName || "Loading..."}
                      </Text>
                    </View>
                    <View style={{display: "flex", flexDirection: "column", alignItems: "flex-end"}}>
                    <Text style={styles.meterNumberText}>
                      Meter SL No
                    </Text>
                      <Text style={styles.meterNumberText}>
                        {consumerData.meterSerialNumber || "Loading..."}
                      </Text>
                      <Text style={styles.meterUIDText}>
                        UID: {consumerData.uniqueIdentificationNo || "Loading..."}
                      </Text>
                    </View>
                    <View style={styles.tapIndicator}>
                      <Text style={styles.tapIndicatorText}>Tap for details</Text>
                    </View>
                  </TouchableOpacity>

                  <View style={styles.lastCommunicationContainer}>
                      <View style={styles.lastCommunicationLeft}>
                      <LastCommunicationIcon width={15} height={10} style={{ marginRight: 5 }} />
                      <Text style={styles.lastCommunicationText}>Last Communication</Text>
                      </View>
                      <Text style={styles.lastCommunicationTimeText}>
                        {consumerData.readingDate || "Loading..."}
                      </Text>                  
                    </View>
                </>
              )
            )}
          </View>
  
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
                      {isLoading ? (
                        <SkeletonLoader variant="barchart" style={{ marginVertical: 20 }} lines={12} />
                      ) : (                    
                        <GroupedBarChart 
                          viewType="daily" 
                          data={consumerData}
                          loading={isLoading}
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
                    {isLoading ? (
                      <SkeletonLoader variant="barchart" style={{ marginVertical: 20 }} lines={12} />
                    ) : (
                      <GroupedBarChart 
                        viewType="monthly" 
                        data={consumerData}
                        loading={isLoading}
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
            skeletonLines={4}
            emptyMessage={consumerData?.alerts?.length === 0 ? "No tamper alerts available" : "No meter status data available"}
            showSerial={false}
            showPriority={false}
            priorityField="occurredOn"
            priorityMapping={{
              "Cover Tamper": "high",
              "CT Open": "high",
              "Magnetic Tamper": "medium",
              "Reverse Current": "high"
            }}
            columns={[
              { key: 'eventName', title: 'Event Name', flex: 1 },
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
    separator: {
      color: COLORS.primaryFontColor,
      fontSize: 12,
      fontFamily: "Manrope-Regular",
      marginHorizontal: 5,
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
  
    meterContainer:{
      padding: 10
    },
    meterInfoContainer:{
      backgroundColor: COLORS.primaryColor,
      borderRadius: 5,
      paddingVertical: 15,
      paddingHorizontal: 15,
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      position: "relative",
    },
    tapIndicator: {
      position: "absolute",
      bottom: 5,
      left: 5,
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

  lastCommunicationContainer:{
    backgroundColor: COLORS.secondaryLightColor, 
    borderRadius: 5,
    padding: 10,
    display: "flex",
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
      fontFamily: "Manrope-Bold",
      backgroundColor: COLORS.secondaryColor,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 5,
      color: COLORS.secondaryFontColor,
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
      paddingHorizontal: 20,
    },
    tableTitle: {
      fontSize: 16,
      fontFamily: 'Manrope-SemiBold',
      color: COLORS.primaryFontColor,
      marginBottom: 10,
    }
  });
  