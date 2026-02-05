/**
 * Optimized Dashboard Screen
 * 
 * Uses optimized data loading and navigation to prevent unnecessary reloads
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
import OptimizedScreen from "../components/OptimizedScreen";
import { useOptimizedData } from "../hooks/useOptimizedData";
import { useNavigationContext } from "../context/NavigationContext";

const OptimizedDashboard = React.memo(({ navigation, route }) => {
  const [selectedView, setSelectedView] = useState("daily");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tableData, setTableData] = useState([]);

  // Use optimized data hook
  const { data: consumerData, isLoading, refresh } = useOptimizedData('consumerData', {
    autoRefresh: true,
    refreshInterval: 300000 // 5 minutes
  });

  const { navigateSmoothly } = useNavigationContext();

  // Memoized table data processing
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

  // Helper functions
  const getTamperTypeText = (tamperType) => {
    const tamperTypes = {
      24: "Tamper Type 24",
      25: "Tamper Type 25",
      26: "Tamper Type 26"
    };
    return tamperTypes[tamperType] || `Tamper Type ${tamperType}`;
  };

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

  // Optimized navigation handlers
  const handleNavigationPress = useCallback((route) => {
    navigateSmoothly(route);
    navigation.navigate(route);
  }, [navigation, navigateSmoothly]);

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

  // Memoized chart data
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

  return (
    <OptimizedScreen 
      dataType="consumerData" 
      showLoader={false} // Dashboard header handles loading
    >
      <View style={styles.container}>
        <StatusBar style="light" />
        
        <DashboardHeader
          navigation={navigation}
          consumerData={consumerData}
          isLoading={isLoading}
          onNavigationPress={handleNavigationPress}
        />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Energy Summary Section */}
          <View style={styles.energySummary}>
            <Text style={styles.sectionTitle}>Energy Summary</Text>
            
            <View style={styles.summaryCards}>
              <View style={styles.summaryCard}>
                <Meter width={24} height={24} />
                <Text style={styles.summaryLabel}>Daily Usage</Text>
                <Text style={styles.summaryValue}>
                  {consumerData?.dailyConsumption || 0} kWh
                </Text>
              </View>
              
              <View style={styles.summaryCard}>
                <LastCommunicationIcon width={24} height={24} />
                <Text style={styles.summaryLabel}>Last Communication</Text>
                <Text style={styles.summaryValue}>
                  {consumerData?.readingDate 
                    ? formatDateTime(consumerData.readingDate)
                    : 'N/A'
                  }
                </Text>
              </View>
            </View>
          </View>

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
    </OptimizedScreen>
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
    zIndex: 1,
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

export default OptimizedDashboard;
