import { StyleSheet, Text, View, ScrollView, RefreshControl } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import DashboardHeader from "../../components/global/DashboardHeader";
import BottomNavigation from "../../components/global/BottomNavigation";
import { fetchBillingHistory } from "../../services/apiService";
import { getBillDateValue } from "../../utils/billingUtils";
import { StatusBar } from "expo-status-bar";
import { getUser } from "../../utils/storage";
import ConsumerDetailsBottomSheet from "../../components/ConsumerDetailsBottomSheet";
import VectorDiagram from "../../components/VectorDiagram";
import { isDemoUser, DEMO_LAST_MONTH_BILL } from "../../constants/demoData";
import { useConsumer } from "../../context/ConsumerContext";
import { LinearGradient } from "expo-linear-gradient";
import MeterIcon from "../../../assets/icons/meterBolt.svg";
import WalletIcon from "../../../assets/icons/walletCard.svg";
import { Shimmer, SHIMMER_LIGHT, SHIMMER_DARK } from "../../utils/loadingManager";

// Fallback if loadingManager exports are missing (e.g. cached bundle)
const SHIMMER_LIGHT_FALLBACK = { base: "#e0e0e0", gradient: ["#e0e0e0", "#f5f5f5", "#e0e0e0"] };
const SHIMMER_DARK_FALLBACK = { base: "#3a3a3c", gradient: ["#3a3a3c", "rgba(255,255,255,0.06)", "#3a3a3c"] };

// Skeleton Usage Card (one summary card placeholder, theme-aware – same pattern as Tickets/Invoices)
const SkeletonUsageCard = ({ isDark, styles }) => {
  const shimmer = (isDark ? (SHIMMER_DARK ?? SHIMMER_DARK_FALLBACK) : (SHIMMER_LIGHT ?? SHIMMER_LIGHT_FALLBACK));
  const cardBg = isDark ? "#1A1F2E" : COLORS.secondaryFontColor;
  const borderColor = isDark ? "rgba(255,255,255,0.08)" : "#F1F3F4";
  return (
    <View style={[styles.professionalCard, { backgroundColor: cardBg, borderColor }]}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Shimmer style={{ flex: 1, height: 16, borderRadius: 4, marginRight: 8 }} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
          <Shimmer style={[styles.professionalCardIcon, { backgroundColor: shimmer.base }]} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
        </View>
        <Shimmer style={{ width: 80, height: 24, borderRadius: 4, marginTop: 4 }} baseColor={shimmer.base} gradientColors={shimmer.gradient} />
      </View>
    </View>
  );
};

const Usage = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  const { consumerData, isConsumerLoading: isLoading, refreshConsumer } = useConsumer();
  const [selectedView, setSelectedView] = useState("daily");
  const [lastMonthBillAmount, setLastMonthBillAmount] = useState(null);
  
  // Bottom sheet state
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [selectedConsumerUid, setSelectedConsumerUid] = useState(null);

  const fetchBillingData = useCallback(async (signal) => {
    try {
      const user = await getUser();
      if (!user?.identifier || signal?.aborted) return;

      if (isDemoUser(user.identifier)) {
        setLastMonthBillAmount(DEMO_LAST_MONTH_BILL);
        return;
      }

      const billingResult = await fetchBillingHistory(user.identifier);
      if (signal?.aborted) return;

      if (billingResult.success && billingResult.data) {
        const billingData = Array.isArray(billingResult.data) ? billingResult.data : [billingResult.data];
        if (billingData.length > 0) {
          const sortedBills = [...billingData].sort(
            (a, b) => getBillDateValue(b) - getBillDateValue(a)
          );
          const lastMonthBill = sortedBills.length > 1 ? sortedBills[1] : sortedBills[0];
          const billAmount = lastMonthBill?.total_amount_payable ?? lastMonthBill?.totalAmount ?? lastMonthBill?.amount ?? lastMonthBill?.total_amount ?? 0;
          setLastMonthBillAmount(billAmount);
        } else {
          setLastMonthBillAmount(null);
        }
      } else {
        setLastMonthBillAmount(null);
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      console.error("Usage: Error fetching billing data:", error);
      setLastMonthBillAmount(null);
    }
  }, []);

  useEffect(() => {
    refreshConsumer();
    const controller = new AbortController();
    fetchBillingData(controller.signal);
    return () => controller.abort();
  }, [refreshConsumer, fetchBillingData]);




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
        // refreshControl={
        //   <RefreshControl
        //     refreshing={isLoading}
        //     onRefresh={handleRefresh}
        //     colors={[COLORS.secondaryColor]}
        //     tintColor={COLORS.secondaryColor}
        //   />
        // }
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

          {/* Professional Cards – skeleton when loading (same shimmer as Tickets/Invoices) */}
          <View style={styles.professionalCardsContainer}>
            {isLoading ? (
              <>
                <SkeletonUsageCard isDark={isDark} styles={styles} />
                <SkeletonUsageCard isDark={isDark} styles={styles} />
              </>
            ) : (
              <>
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
                      {selectedView === "monthly" ? formatCurrency(lastMonthBillAmount) : "N/A"}
                    </Text>
                  </View>
                </View>
              </>
            )}
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
