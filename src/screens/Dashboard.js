import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import Arrow from "../../assets/icons/arrow.svg";
import GroupedBarChart from "../components/GroupedBarChart";
import DashboardHeader from "../components/global/DashboardHeader";
import Table from "../components/global/Table";
import DatePicker from "../components/global/DatePicker";
import Meter from "../../assets/icons/meterWhite.svg";
import LastCommunicationIcon from "../../assets/icons/signal.svg";



const Dashboard = ({ navigation, route }) => {
  const [selectedView, setSelectedView] = useState("daily");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [tableData, setTableData] = useState([]);
  const [isTableLoading, setIsTableLoading] = useState(true);

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

  // Load table data
  useEffect(() => {
    const loadTableData = async () => {
      setIsTableLoading(true);
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setTableData(meterStatusData);
      } catch (error) {
        console.error('Error loading table data:', error);
        setTableData([]);
      } finally {
        setIsTableLoading(false);
      }
    };

    loadTableData();
  }, []);
  return (
    <ScrollView
      style={styles.Container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.Container}>
        <StatusBar style="dark" />
        <DashboardHeader navigation={navigation} showBalance={true} />

        <View style={styles.meterContainer}>
          <View style={styles.meterInfoContainer}>
          <View style={styles.meterInfoRow}>
            <Meter width={30} height={30} />
            <Text style={styles.meterConsumerText}>GMR AERO TOWER 2 INCOMER</Text>
          </View>
           <View style={styles.meterInfoColumn}>
           <Text style={styles.meterNumberText}>18132429</Text>
            <Text style={styles.meterUIDText}>UID: BI25GMRA014</Text>
           </View>
 
          </View>
          <View style={styles.lastCommunicationContainer}>
            <View style={styles.lastCommunicationLeft}>
             <LastCommunicationIcon width={15} height={10} style={{ marginRight: 5 }} />
             <Text style={styles.lastCommunicationText}>Last Communication</Text>
            </View>
            <Text style={styles.lastCommunicationTimeText}>07/09/2025 6:35 PM</Text>
            </View>
        </View>

        <View style={styles.whiteContainer}>
          <View style={styles.energyHeader}>
            <Text style={styles.energyText}>Energy Summary</Text>
            <View style={styles.toggleContainer}>
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
              <Text> / </Text>
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
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.datePickerSection}>
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
          </View>

          <View style={styles.graphsContainer}>
            {selectedView === "daily" ? (
              <>
                <Text style={styles.thismonthText}>
                  Today's Usage: <Text style={styles.kwhText}>20kWh</Text>
                </Text>
                <View style={styles.percentageContainer}>
                  <View style={styles.tenPercentageTextContainer}>
                    <Text style={styles.percentText}>5%</Text>
                    <Arrow width={12} height={12} fill="#55B56C" />
                  </View>
                  <Text style={styles.lastText}>Yesterday.</Text>
                </View>
                <View style={styles.chartContainer}>
                  <GroupedBarChart viewType="daily" />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.thismonthText}>
                  This Month's Usage: <Text style={styles.kwhText}>620kWh</Text>
                </Text>
                <View style={styles.percentageContainer}>
                  <View style={styles.tenPercentageTextContainer}>
                    <Text style={styles.percentText}>10%</Text>
                    <Arrow width={12} height={12} fill="#55B56C" />
                  </View>
                  <Text style={styles.lastText}>Last Month.</Text>
                </View>
                <View style={styles.chartContainer}>
                  <GroupedBarChart viewType="monthly" />
                </View>
              </>
            )}
          </View>
        </View>
        <Table 
          data={tableData}
          loading={isTableLoading}
          emptyMessage="No meter status data available"
          showSerial={false}
          showPriority={false}
          priorityField="occurredOn"
          priorityMapping={{
            "Connection Issue": "high",
            "Meter Issue": "medium",
            "Power Outage": "high"
          }}
          columns={[
            { key: 'eventName', title: 'Event Name', flex: 1 },
            { key: 'occurredOn', title: 'Occurred On', flex: 2 },
            { key: 'status', title: 'Status', flex: 1 }
          ]}
        />
      </View>
    </ScrollView>
  );
};

export default Dashboard;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
  },
  whiteContainer: {
    // padding: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  energyText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    marginBottom: 20,
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

  meterContainer:{
    padding: 20
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
  meterInfoRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "50%"
  },
  meterInfoColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end"
  },
  energyHeader: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row",
  },
  toggleContainer: {
    display: "flex",
    flexDirection: "row"
  },
  percentageContainer: {
    display: "flex",
    flexDirection: "row",
    marginTop: 10,
  },
  chartContainer: {
    display: "flex",
    alignItems: "center"
  }
});
