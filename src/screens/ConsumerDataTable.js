import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import DashboardHeader from "../components/global/DashboardHeader";
import Table from "../components/global/Table";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import BiLogo from "../../assets/icons/Logo.svg";

const ConsumerDataTable = ({ navigation, route }) => {
  const { consumerData, loading, viewType: initialViewType } = route?.params || {};
  const [selectedView, setSelectedView] = useState(initialViewType || "daily");
  const [tableData, setTableData] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

  // Process API data for table - show only latest 10 entries (mirrors BarChart logic)
  useEffect(() => {
    const processTableData = () => {
      setIsTableLoading(true);
      
      try {
        if (consumerData && consumerData.chartData) {
          const chartType = selectedView === "daily" ? consumerData.chartData.daily : consumerData.chartData.monthly;
          
          if (chartType && chartType.seriesData && chartType.seriesData.length > 0) {
            const seriesData = chartType.seriesData[0]; // Get first series
            const allData = seriesData.data || [];
            const allLabels = chartType.xAxisData || [];
            
            // Get only the latest 10 entries (same as BarChart)
            const latestData = allData.slice(-10);
            const latestLabels = allLabels.slice(-10);
            
            // Create table data with proper formatting
            const formattedData = latestLabels.map((label, index) => ({
              id: index + 1,
              period: label,
              consumption: latestData[index] || 0,
              date: formatDateForTable(label, selectedView),
              status: getConsumptionStatus(latestData[index] || 0).status,
              statusColor: getConsumptionStatus(latestData[index] || 0).color,
            }));
            
            setTableData(formattedData);
          } else {
            setTableData([]);
          }
        } else {
          setTableData([]);
        }
      } catch (error) {
        console.error('Error processing table data:', error);
        setTableData([]);
      } finally {
        setIsTableLoading(false);
      }
    };

    processTableData();
  }, [consumerData, selectedView]);

  // Format date for table display
  const formatDateForTable = (label, viewType) => {
    if (viewType === "daily") {
      // For daily view, show date
      const today = new Date();
      const dayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(label);
      if (dayIndex !== -1) {
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (6 - dayIndex));
        return targetDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
      return label;
    } else {
      // For monthly view, show year
      return "2024";
    }
  };

  // Format consumption value
  const formatConsumption = (value) => {
    return typeof value === 'number' ? value.toFixed(1) : value;
  };

  // Get consumption status color
  const getConsumptionStatus = (value) => {
    if (value >= 8) return { color: COLORS.secondaryColor, status: "High" };
    if (value >= 6) return { color: "#F59E0B", status: "Medium" };
    return { color: "#EF4444", status: "Low" };
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.bluecontainer}>
        <View style={styles.TopMenu}>
          <Pressable
            style={styles.barsIcon}
            onPress={() => navigation.navigate("SideMenu")}
          >
            <Menu width={18} height={18} fill="#202d59" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("Dashboard")}>
            <BiLogo width={45} height={45} />
          </Pressable>
          <Pressable
            style={styles.bellIcon}
            onPress={() => navigation.navigate("Profile")}
          >
            <Notification width={18} height={18} fill="#202d59" />
          </Pressable>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, selectedView === "daily" && styles.toggleButtonActive]}
          onPress={() => setSelectedView("daily")}
        >
          <Text style={[styles.toggleText, selectedView === "daily" && styles.toggleTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, selectedView === "monthly" && styles.toggleButtonActive]}
          onPress={() => setSelectedView("monthly")}
        >
          <Text style={[styles.toggleText, selectedView === "monthly" && styles.toggleTextActive]}>
            Monthly
          </Text>
        </TouchableOpacity>
      </View>

      {/* Table Section */}
      <View style={styles.tableSection}>       
        <Table
          data={tableData}
          loading={isTableLoading}
          emptyMessage="No consumption data available"
          showSerial={false}
          showPriority={true}
          priorityField="consumption"
          priorityMapping={(value) => {
            const status = getConsumptionStatus(value);
            return status.status.toLowerCase();
          }}
          columns={[
            { 
              key: 'period', 
              title: 'Period', 
              flex: 1,
              render: (item) => (
                <Text style={styles.tableCellText}>{item.period}</Text>
              )
            },
            { 
              key: 'date', 
              title: 'Date', 
              flex: 1,
              render: (item) => (
                <Text style={styles.tableCellText}>{item.date}</Text>
              )
            },
            { 
              key: 'consumption', 
              title: 'Consumption (kWh)', 
              flex: 1,
              render: (item) => (
                <Text style={styles.tableCellText}>{formatConsumption(item.consumption)}</Text>
              )
            },
            { 
              key: 'status', 
              title: 'Status', 
              flex: 1, 
              render: (item) => (
                <View style={[styles.statusBadge, { backgroundColor: item.statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: item.statusColor }]}>
                    {item.status}
                  </Text>
                </View>
              )
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondaryFontColor,
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
    elevation: 5,
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
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 15,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primaryColor,
  },
  toggleText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.primaryFontColor,
  },
  toggleTextActive: {
    color: COLORS.secondaryFontColor,
  },
  tableSection: {
    flex: 1,
    // marginHorizontal: 20,
    // marginBottom: 20,
  },
  tableTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    marginBottom: 15,
  },
  tableCellText: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: COLORS.primaryFontColor,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Manrope-SemiBold',
  },
});

export default ConsumerDataTable;

