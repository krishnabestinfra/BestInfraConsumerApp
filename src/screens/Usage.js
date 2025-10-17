import { StyleSheet, Text, View, ScrollView, RefreshControl, TouchableOpacity } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../constants/colors";
import DashboardHeader from "../components/global/DashboardHeader";
import { getCachedConsumerData } from "../utils/cacheManager";
import { fetchConsumerData, syncConsumerData } from "../services/apiService";
import { StatusBar } from "expo-status-bar";
import { getUser } from "../utils/storage";
import ConsumerDetailsBottomSheet from "../components/ConsumerDetailsBottomSheet";
import { apiClient } from '../services/apiClient';
import { LinearGradient } from "expo-linear-gradient";
import MeterIcon from "../../assets/icons/meterBolt.svg";
import WalletIcon from "../../assets/icons/walletCard.svg";


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

  // Helper functions for usage data
  const getDailyConsumption = () => {
    if (!consumerData?.chartData?.daily?.seriesData?.[0]?.data) return 0;
    const dailyData = consumerData.chartData.daily.seriesData[0].data;
    return dailyData[dailyData.length - 1] || 0;
  };

  const getMonthlyConsumption = () => {
    if (!consumerData?.chartData?.monthly?.seriesData?.[0]?.data) return 0;
    const monthlyData = consumerData.chartData.monthly.seriesData[0].data;
    return monthlyData[monthlyData.length - 1] || 0;
  };




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

    {/* Usage Summary Section */}
    <View style={styles.usageSummaryContainer}>
      {/* Header with Toggle */}
      <View style={styles.summaryHeader}>
        <Text style={styles.summaryTitle}>Usage Summary</Text>
        <View style={styles.modernToggleContainer}>
          <TouchableOpacity 
            style={[styles.modernToggleButton, selectedView === "daily" && styles.modernToggleButtonActive]}
            onPress={() => setSelectedView("daily")}
            activeOpacity={0.7}
          >
            <Text style={[styles.modernToggleText, selectedView === "daily" && styles.modernToggleTextActive]}>
              Daily
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modernToggleButton, selectedView === "monthly" && styles.modernToggleButtonActive]}
            onPress={() => setSelectedView("monthly")}
            activeOpacity={0.7}
          >
            <Text style={[styles.modernToggleText, selectedView === "monthly" && styles.modernToggleTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Professional Cards */}
      <View style={styles.professionalCardsContainer}>
        {/* Consumption Card */}
        <View style={styles.professionalCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.professionalCardTitle}>
                {selectedView === "daily" ? "Daily Consumption" : "Monthly Consumption"}
              </Text>
              <LinearGradient
                colors={["#E8F5E9", "#C8E6C9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.professionalCardIcon}
              >
                <MeterIcon width={18} height={18} />
              </LinearGradient>
            </View>
            <Text style={styles.professionalCardValue}>
              {selectedView === "daily" ? `${getDailyConsumption()} kWh` : `${getMonthlyConsumption()} kWh`}
            </Text>
          </View>
        </View>

        {/* Charges Card */}
        <View style={styles.professionalCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.professionalCardTitle}>
                {selectedView === "daily" ? "Daily Charges" : "Monthly Charges"}
              </Text>
              <LinearGradient
                colors={["#E8F5E9", "#C8E6C9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.professionalCardIcon}
              >
                <WalletIcon width={18} height={18} />
              </LinearGradient>
            </View>
            <Text style={styles.professionalCardValue}>
              N/A
            </Text>
          </View>
        </View>
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
  // Modern Usage Summary Styles
  usageSummaryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  modernToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F8F9FA",
    borderRadius: 5,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E9ECEF",
  },
  modernToggleButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  modernToggleButtonActive: {
    backgroundColor: COLORS.secondaryColor,
    shadowColor: COLORS.secondaryColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modernToggleText: {
    fontSize: 13,
    fontFamily: "Manrope-Medium",
    color: "#6C757D",
  },
  modernToggleTextActive: {
    color: COLORS.secondaryFontColor,
    fontFamily: "Manrope-Bold",
  },
  professionalCardsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  professionalCard: {
    flex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F1F3F4",
    elevation: 0.5,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  professionalCardTitle: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: "#6C757D",
    flex: 1,
    marginRight: 8,
    lineHeight: 16,
  },
  professionalCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  professionalCardValue: {
    fontSize: 20,
    fontFamily: "Manrope-Bold",
    color: COLORS.secondaryColor,
    lineHeight: 24,
  },
});
