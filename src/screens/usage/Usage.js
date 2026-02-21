import { StyleSheet, Text, View, ScrollView, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import DashboardHeader from "../../components/global/DashboardHeader";
import BottomNavigation from "../../components/global/BottomNavigation";
import { getCachedConsumerData } from "../../utils/cacheManager";
import { fetchConsumerData, syncConsumerData, fetchBillingHistory } from "../../services/apiService";
import { getBillDateValue } from "../../utils/billingUtils";
import { StatusBar } from "expo-status-bar";
import { getUser } from "../../utils/storage";
import ConsumerDetailsBottomSheet from "../../components/ConsumerDetailsBottomSheet";
import VectorDiagram from "../../components/VectorDiagram";
import { apiClient } from '../../services/apiClient';
import { isDemoUser, getDemoUsageConsumerData, DEMO_LAST_MONTH_BILL } from "../../constants/demoData";
import { LinearGradient } from "expo-linear-gradient";
import MeterIcon from "../../../assets/icons/meterBolt.svg";
import WalletIcon from "../../../assets/icons/walletCard.svg";


const Usage = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  // Main state
  const [consumerData, setConsumerData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState("daily");
  const [lastMonthBillAmount, setLastMonthBillAmount] = useState(null);
  
  // Bottom sheet state
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedConsumerUid, setSelectedConsumerUid] = useState(null);

  // Fetch last month's bill amount from billing history
  const fetchLastMonthBill = useCallback(async (uid) => {
    if (!uid) return;
    
    try {
      console.log("🔄 Usage: Fetching billing history for last month bill");
      const billingResult = await fetchBillingHistory(uid);
      
      if (billingResult.success && billingResult.data) {
        const billingData = Array.isArray(billingResult.data) 
          ? billingResult.data 
          : [billingResult.data];
        
        if (billingData.length === 0) {
          setLastMonthBillAmount(null);
          return;
        }
        
        // Sort billing data by date (newest first) to ensure correct order
        const sortedBills = [...billingData].sort(
          (a, b) => getBillDateValue(b) - getBillDateValue(a)
        );
        
        // Get the second item (index 1) as last month's bill (index 0 is current month)
        // If only one bill exists, use it
        const lastMonthBill = sortedBills.length > 1 ? sortedBills[1] : sortedBills[0];
        
        const billAmount = lastMonthBill?.total_amount_payable || 
                          lastMonthBill?.totalAmount || 
                          lastMonthBill?.amount || 
                          lastMonthBill?.total_amount || 
                          0;
        
        setLastMonthBillAmount(billAmount);
        console.log("✅ Usage: Last month bill amount:", billAmount);
      }
    } catch (error) {
      console.error("❌ Usage: Error fetching last month bill:", error);
      setLastMonthBillAmount(null);
    }
  }, []);

  // Fetch consumer data with proper error handling (or demo data if using demo credentials)
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

      // DEMO MODE: if logged in with demo credentials, use local demo data
      if (isDemoUser(user.identifier)) {
        const demoData = getDemoUsageConsumerData(user.identifier);
        setConsumerData(demoData);
        setLastMonthBillAmount(DEMO_LAST_MONTH_BILL);
        console.log("📊 Usage: Using demo consumer data for:", user.identifier);
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
        
        // Fetch last month's bill amount
        const uid = result.data?.uniqueIdentificationNo || user.identifier;
        fetchLastMonthBill(uid);
        
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
  }, [fetchLastMonthBill]);

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

  // Format currency for display
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || amount === 0) return 'N/A';
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount);
    if (isNaN(numAmount)) return 'N/A';
    return `₹${numAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };




  return (
    <View style={[styles.mainContainer, isDark && { backgroundColor: themeColors.screen }]}>
      <ScrollView
        style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={{ paddingBottom: 130 }}
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

        <View style={[styles.contentOnTop, isDark && { backgroundColor: themeColors.screen }]}>
        {/* Usage Summary Section */}
        <View style={styles.usageSummaryContainer}>
          {/* Header with Toggle */}
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, isDark && { color: '#FFFFFF' }]}>Usage Summary</Text>
            <View style={styles.textToggleContainer}>
              <Text style={styles.toggleText}>
                <Text
                  style={[
                    styles.toggleTextItem,
                    selectedView === "daily" && styles.toggleTextSelected,
                    selectedView !== "daily" && isDark && { color: 'rgba(255,255,255,0.6)' }
                  ]}
                  onPress={() => setSelectedView("daily")}
                >
                  Daily
                </Text>
                <Text style={[styles.toggleSeparator, isDark && { color: 'rgba(255,255,255,0.6)' }]}> / </Text>
                <Text
                  style={[
                    styles.toggleTextItem,
                    selectedView === "monthly" && styles.toggleTextSelected,
                    selectedView !== "monthly" && isDark && { color: 'rgba(255,255,255,0.6)' }
                  ]}
                  onPress={() => setSelectedView("monthly")}
                >
                  Monthly
                </Text>
              </Text>
            </View>
          </View>

          {/* Professional Cards */}
          <View style={styles.professionalCardsContainer}>
            {/* Consumption Card */}
            <View style={[styles.professionalCard, isDark && { backgroundColor: '#1A1F2E', borderColor: 'rgba(255,255,255,0.08)' }]}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.professionalCardTitle, isDark && { color: '#FFFFFF' }]}>
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
            <View style={[styles.professionalCard, isDark && { backgroundColor: '#1A1F2E', borderColor: 'rgba(255,255,255,0.08)' }]}>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.professionalCardTitle, isDark && { color: '#FFFFFF' }]}>
                    {selectedView === "daily" ? "Daily\nCharges" : "Monthly\nCharges"}
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
                  {selectedView === "monthly" 
                    ? (isLoading ? "Loading..." : formatCurrency(lastMonthBillAmount))
                    : "N/A"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Vector Diagram Section */}
        <VectorDiagram
          containerStyle={isDark ? { backgroundColor: '#1A1F2E' } : undefined}
          isDark={isDark}
          voltage={{
            r: consumerData?.rPhaseVoltage || 0,
            y: consumerData?.yPhaseVoltage || 0,
            b: consumerData?.bPhaseVoltage || 0,
          }}
          current={{
            r: consumerData?.rPhaseCurrent || 0,
            y: consumerData?.yPhaseCurrent || 0,
            b: consumerData?.bPhaseCurrent || 0,
          }}
          powerFactor={{
            r: consumerData?.rPhasePowerFactor || 0,
            y: consumerData?.yPhasePowerFactor || 0,
            b: consumerData?.bPhasePowerFactor || 0,
          }}
          totalKW={consumerData?.kW || null}
          loading={isLoading}
        />
        </View>
      </ScrollView>

      {/* Consumer Details Bottom Sheet */}
      <ConsumerDetailsBottomSheet
        visible={bottomSheetVisible}
        onClose={handleBottomSheetClose}
        consumerUid={selectedConsumerUid}
      />
      
      {/* Bottom Navigation - Sticky at bottom */}
      <BottomNavigation navigation={navigation} />
    </View>
  );
};

export default Usage;

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.secondaryFontColor,
  },
  Container: {
    flex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  contentOnTop: {
    zIndex: 1,
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
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
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
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
    color: '#787878',
    fontSize: 12,
    fontFamily: "Manrope-Medium",
  },
  toggleTextSelected: {
    color: COLORS.secondaryColor,
  },
  toggleSeparator: {
    color: '#787878',
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    marginHorizontal: 4,
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
