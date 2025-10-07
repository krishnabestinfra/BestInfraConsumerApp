import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants/colors";
import DashboardHeader from "../components/global/DashboardHeader";
import { getCachedConsumerData } from "../utils/cacheManager";
import { fetchConsumerData, syncConsumerData } from "../services/apiService";
import ConsumerGroupedBarChart from "../components/ConsumerGroupedBarChart";
import { StatusBar } from "expo-status-bar";
import Arrow from "../../assets/icons/arrow.svg";
import { getUser } from "../utils/storage";
import ConsumerDetailsBottomSheet from "../components/ConsumerDetailsBottomSheet";
import { apiClient } from '../services/apiClient';


const Usage = ({ navigation }) => {
  // Main state
  const [consumerData, setConsumerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState("daily");
  
  // Bottom sheet state
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedConsumerUid, setSelectedConsumerUid] = useState(null);

  // Fetch consumer data with proper error handling
  const fetchConsumerData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("🔄 Usage: Starting data fetch");

      // Get authenticated user data
      const user = await getUser();

      if (!user || !user.identifier) {
        console.error("❌ Usage: No authenticated user found");
        setIsLoading(false);
        return;
      }

      console.log("🔄 Usage: Fetching data for:", user.identifier);

      // Try cached data first for instant display
      const cachedResult = await getCachedConsumerData(user.identifier);
      if (cachedResult.success && cachedResult.data) {
        setConsumerData(cachedResult.data);
        console.log("⚡ Usage: Using cached data");
        setIsLoading(false);
      }

      // Fetch fresh data from API
      const result = await apiClient.getConsumerData(user.identifier);
      
      if (result.success && result.data) {
        setConsumerData(result.data);
        console.log("✅ Usage: Fresh data loaded:", result.data);
        
        // Background sync for future updates
        syncConsumerData(user.identifier).catch(error => {
          console.error("⚠️ Usage: Background sync failed:", error);
        });
      } else {
        throw new Error(result.error || "Failed to fetch consumer data");
      }
    } catch (error) {
      console.error("❌ Usage: API error:", error);
      
      // Set fallback data with user's actual identifier
      const user = await getUser();
      const fallbackData = {
        name: user?.name || "Consumer",
        meterSerialNumber: user?.meterSerialNumber || "N/A",
        uniqueIdentificationNo: user?.identifier || user?.consumerNumber || "N/A",
        readingDate: new Date().toLocaleString(),
        totalOutstanding: 0,
        dailyConsumption: 0,
        monthlyConsumption: 0,
        chartData: {
          daily: {
            seriesData: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
            xAxisData: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
          },
          monthly: {
            seriesData: [{ data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }],
            xAxisData: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]
          }
        }
      };
      
      setConsumerData(fallbackData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchConsumerData();
  }, [fetchConsumerData]);

  // Add refresh functionality
  const handleRefresh = useCallback(() => {
    console.log("🔄 Usage: Manual refresh triggered");
    fetchConsumerData();
  }, [fetchConsumerData]);



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

  // Calculate percentage change (mock data for now)
  const getPercentageChange = () => {
    return selectedView === "daily" ? 5 : 10;
  };

  // Get comparison text
  const getComparisonText = () => {
    return selectedView === "daily" ? "Yesterday." : "Last Month.";
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
    <ScrollView
      style={styles.Container}
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
      <StatusBar style="dark" />
      <DashboardHeader
        navigation={navigation}
        variant="usage"
        showBalance={false}
        consumerData={consumerData}
        isLoading={isLoading}
      />



<View style={styles.whiteContainer}>
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
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={COLORS.secondaryColor} />
                  <Text style={styles.loadingText}>Loading usage data...</Text>
                </View>
              ) : selectedView === "daily" ? (
                <>
                  <Text style={styles.thismonthText}>
                    Today's Usage: <Text style={styles.kwhText}>
                      {`${getDailyUsage()}kWh`}
                    </Text>
                  </Text>
                  <View
                    style={{                      flexDirection: "row",
                      marginTop: 10,
                    }}
                  >
                    <View style={styles.tenPercentageTextContainer}>
                      <Text style={styles.percentText}>{getPercentageChange()}%</Text>
                      <Arrow width={12} height={12} fill="#55B56C" />
                    </View>
                    <Text style={styles.lastText}>{getComparisonText()}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <ConsumerGroupedBarChart 
                      viewType="daily" 
                      data={consumerData}
                      loading={isLoading}
                      onBarPress={handleBarPress}
                    />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.thismonthText}>
                    This Month's Usage: <Text style={styles.kwhText}>
                      {`${getMonthlyUsage()}kWh`}
                    </Text>
                  </Text>
                  <View
                    style={{                      flexDirection: "row",
                      marginTop: 10,
                    }}
                  >
                    <View style={styles.tenPercentageTextContainer}>
                      <Text style={styles.percentText}>{getPercentageChange()}%</Text>
                      <Arrow width={12} height={12} fill="#55B56C" />
                    </View>
                    <Text style={styles.lastText}>{getComparisonText()}</Text>
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <ConsumerGroupedBarChart 
                      viewType="monthly" 
                      data={consumerData}
                      loading={isLoading}
                      onBarPress={handleBarPress}
                    />
                  </View>
                </>
              )}
            </View>
          </View>
      
      {/* Consumer Details Bottom Sheet */}
      <ConsumerDetailsBottomSheet
        visible={bottomSheetVisible}
        onClose={handleBottomSheetClose}
        consumerUid={selectedConsumerUid}
      />
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
    fontFamily: "Manrope-Regular",
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
    fontFamily: "Manrope-Regular",
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    marginTop: 10,
  },
});
