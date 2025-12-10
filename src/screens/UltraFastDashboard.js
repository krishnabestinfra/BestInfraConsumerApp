/**
 * Ultra Fast Dashboard Screen
 * 
 * Optimized for sub-500ms loading with:
 * - Instant cache display
 * - Parallel data loading
 * - Aggressive optimizations
 * - Minimal loading states
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import Arrow from "../../assets/icons/arrow.svg";
import GroupedBarChart from "../components/GroupedBarChart";
import DashboardHeader from "../components/global/DashboardHeader";
import Table from "../components/global/Table";
import DatePicker from "../components/global/DatePicker";
import Meter from "../../assets/icons/meterWhite.svg";
import LastCommunicationIcon from "../../assets/icons/signal.svg";
import UltraFastScreen from "../components/UltraFastScreen";
import { useUltraFastData } from "../hooks/useUltraFastData";

const UltraFastDashboard = React.memo(({ navigation, route }) => {
  const [selectedView, setSelectedView] = useState("daily");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  // Ultra-fast data loading with 500ms max loading time
  const { data: consumerData, isLoading, refresh } = useUltraFastData('consumerData', {
    maxLoadingTime: 500,
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  });

  // Memoized table data processing - only process when data changes
  const processedTableData = useMemo(() => {
    if (!consumerData?.alerts) return [];

    return consumerData.alerts
      .sort((a, b) => new Date(b.tamperDatetime) - new Date(a.tamperDatetime))
      .slice(0, 10)
      .map((alert, index) => ({
        id: alert.id || index + 1,
        eventName: getTamperTypeText(alert.tamperType),
        occurredOn: formatDateTime(alert.tamperDatetime),
        status: alert.tamperStatus === 1 ? "Start" : "End"
      }));
  }, [consumerData?.alerts]);

  // Memoized chart data - only recalculate when data or view changes
  const chartData = useMemo(() => {
    if (!consumerData?.chartData) return null;

    const chartType = selectedView === "daily" 
      ? consumerData.chartData.daily 
      : consumerData.chartData.monthly;

    if (!chartType?.seriesData?.[0]?.data) return null;

    return {
      data: chartType.seriesData[0].data.slice(-10),
      labels: chartType.xAxisData?.slice(-10) || []
    };
  }, [consumerData?.chartData, selectedView]);

  // Memoized summary data
  const summaryData = useMemo(() => {
    if (!consumerData) return null;

    return {
      dailyUsage: consumerData.dailyConsumption || 0,
      monthlyUsage: consumerData.monthlyConsumption || 0,
      lastCommunication: consumerData.readingDate || 'N/A',
      totalOutstanding: consumerData.totalOutstanding || 0
    };
  }, [consumerData]);

  // Optimized navigation handlers
  const handleNavigationPress = useCallback((route) => {
    navigation.navigate(route);
  }, [navigation]);

  const handleViewChange = useCallback((view) => {
    setSelectedView(view);
  }, []);

  const handleDateChange = useCallback((type, date) => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }
  }, []);

  // Helper functions - memoized for performance
  const getTamperTypeText = useCallback((tamperType) => {
    const tamperTypes = {
      24: "Tamper Type 24",
      25: "Tamper Type 25",
      26: "Tamper Type 26"
    };
    return tamperTypes[tamperType] || `Tamper Type ${tamperType}`;
  }, []);

  const formatDateTime = useCallback((dateString) => {
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
  }, []);

  // Data loaded callback
  const handleDataLoaded = useCallback((data) => {
    console.log('✅ UltraFast Dashboard: Data loaded successfully');
  }, []);

  return (
    <UltraFastScreen 
      dataType="consumerData" 
      maxLoadingTime={500}
      onDataLoaded={handleDataLoaded}
    >
      <View style={styles.container}>
        <StatusBar style="light" />
        
        <DashboardHeader
          navigation={navigation}
          consumerData={consumerData}
          isLoading={isLoading}
          onNavigationPress={handleNavigationPress}
        />

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true} // Optimize for large lists
        >
          {/* Energy Summary Section */}
          {summaryData && (
            <View style={styles.energySummary}>
              <Text style={styles.sectionTitle}>Energy Summary</Text>
              
              <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                  <Meter width={24} height={24} />
                  <Text style={styles.summaryLabel}>Daily Usage</Text>
                  <Text style={styles.summaryValue}>
                    {summaryData.dailyUsage} kWh
                  </Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <LastCommunicationIcon width={24} height={24} />
                  <Text style={styles.summaryLabel}>Last Communication</Text>
                  <Text style={styles.summaryValue}>
                    {summaryData.lastCommunication !== 'N/A' 
                      ? formatDateTime(summaryData.lastCommunication)
                      : 'N/A'
                    }
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Chart Section */}
          {chartData && (
            <View style={styles.chartSection}>
              <View style={styles.chartHeader}>
                <Text style={styles.sectionTitle}>Usage Trend</Text>
                <View style={styles.viewToggle}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      selectedView === "daily" && styles.activeToggle
                    ]}
                    onPress={() => handleViewChange("daily")}
                  >
                    <Text style={[
                      styles.toggleText,
                      selectedView === "daily" && styles.activeToggleText
                    ]}>
                      Daily
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      selectedView === "monthly" && styles.activeToggle
                    ]}
                    onPress={() => handleViewChange("monthly")}
                  >
                    <Text style={[
                      styles.toggleText,
                      selectedView === "monthly" && styles.activeToggleText
                    ]}>
                      Monthly
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <GroupedBarChart
                data={chartData.data}
                labels={chartData.labels}
                selectedView={selectedView}
              />
            </View>
          )}

          {/* Alerts Table */}
          <View style={styles.alertsSection}>
            <Text style={styles.sectionTitle}>Recent Alerts</Text>
            <Table 
              data={processedTableData}
              loading={isLoading}
              skeletonLines={3}
              emptyMessage="No alerts available"
              showSerial={true}
              showPriority={false}
              columns={[
                { key: 'eventName', title: 'Event Name', flex: 1 },
                { key: 'occurredOn', title: 'Occurred On', flex: 2 },
                { key: 'status', title: 'Status', flex: 1 }
              ]}
            />
          </View>
        </ScrollView>
      </View>
    </UltraFastScreen>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundColor,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  energySummary: {
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primaryFontColor,
    marginBottom: 15,
    fontFamily: 'Manrope-Bold',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.secondaryFontColor,
    marginTop: 8,
    fontFamily: 'Manrope-Medium',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primaryFontColor,
    marginTop: 4,
    fontFamily: 'Manrope-Bold',
  },
  chartSection: {
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: COLORS.secondaryColor,
  },
  toggleText: {
    fontSize: 12,
    color: COLORS.primaryFontColor,
    fontFamily: 'Manrope-Medium',
  },
  activeToggleText: {
    color: 'white',
    fontFamily: 'Manrope-Bold',
  },
  alertsSection: {
    marginBottom: 20,
  },
});

export default UltraFastDashboard;
