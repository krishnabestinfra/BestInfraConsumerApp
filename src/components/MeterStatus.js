import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { COLORS } from "../constants/colors";

const MeterStatus = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerTable}>
        <Text style={styles.headerText}>Meter No</Text>
        <Text style={styles.headerText}>Location</Text>
        <Text style={styles.headerText}>Status</Text>
      </View>
      <View style={styles.dataTab}>
        <Text style={styles.dataText}>LR975027</Text>
        <Text style={styles.dataText}>Flat 202</Text>
        <Text style={styles.dataStatusActive}>Occupied</Text>
      </View>
      <View style={styles.dataTab}>
        <Text style={styles.dataText}>LR965542</Text>
        <Text style={styles.dataText}>Flat 221</Text>
        <Text style={styles.dataStatus}>Vacated</Text>
      </View>
      <View style={styles.dataTab}>
        <Text style={styles.dataText}>LR975510</Text>
        <Text style={styles.dataText}>Flat 420</Text>
        <Text style={styles.dataStatus}>Vacated</Text>
      </View>
    </View>
  );
};

export default MeterStatus;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal:20,
    paddingBottom:20
  },
  headerTable: {
    backgroundColor: "#EEF8F0",
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headerText: {
    flex: 1,
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 14,
    textAlign: "left",
  },
  dataTab: {
    backgroundColor: "#E9EAEE",
    borderRadius: 5,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 2,
    borderRadius: 5,
  },
  dataText: {
    flex: 1,
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Regular",
    fontSize: 12,
    textAlign: "left",
  },
  dataStatusActive: {
    flex: 1,
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Medium",
    fontSize: 12,
    textAlign: "left",
  },
  dataStatus: {
    flex: 1,
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Regular",
    fontSize: 12,
    textAlign: "left",
  },
});
