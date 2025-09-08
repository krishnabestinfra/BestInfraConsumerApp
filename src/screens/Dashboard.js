import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import Arrow from "../../assets/icons/arrow.svg";
import GroupedBarChart from "../components/GroupedBarChart";
import DashboardHeaderSection from "../components/DashboardHeaderSection";
import MeterStatus from "../components/MeterStatus";

const Dashboard = ({ navigation,route }) => {
  const [selectedView, setSelectedView] = useState("daily");
  // const { userName } = route?.params || {};
  //  const { isGuest } = route.params || {};
  return (
    <ScrollView
      style={styles.Container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.Container}>
        <StatusBar style="dark" />
        <DashboardHeaderSection navigation={navigation}/>
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
            </View>
          </View>
          <View style={styles.graphsContainer}>
            {selectedView === "daily" ? (
              <>
                <Text style={styles.thismonthText}>
                  Today's Usage: <Text style={styles.kwhText}>20kWh</Text>
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
                  <GroupedBarChart viewType="daily" />
                </View>
              </>
            ) : (
              <>
                <Text style={styles.thismonthText}>
                  This Month's Usage: <Text style={styles.kwhText}>620kWh</Text>
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
                  <GroupedBarChart viewType="monthly" />
                </View>
              </>
            )}
          </View>
        </View>
        <MeterStatus />
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
    padding: 20,
  },
  energyText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Bold",
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
});
