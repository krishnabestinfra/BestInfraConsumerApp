import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Pressable, Modal, Alert } from "react-native";
import React, { useState } from "react";
import { COLORS } from "../constants/colors";
import BottomNavigation from "../components/global/BottomNavigation";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import Logo from "../components/global/Logo";
import AnimatedRings from "../components/global/AnimatedRings";
import { StatusBar } from "expo-status-bar";
import DropDownIcon from "../../assets/icons/dropdownArrow.svg";
import ShareIcon from "../../assets/icons/share.svg";
import DatePicker from "../components/global/DatePicker";
import DocumentIcon from "../../assets/icons/document.svg";


const Reports = ({ navigation }) => {
  const [filterType, setFilterType] = useState("Monthly Consumption");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [recentReports, setRecentReports] = useState([
    { id: 1, name: "Jan 2026 Consumption.pdf" },
    { id: 2, name: "Dec 2025 Consumption.pdf" },
    { id: 3, name: "Nov 2025 Consumption.pdf" },
  ]);

  const formatDate = (date) => {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const handleGetReport = () => {
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select both start and end dates");
      return;
    }
    // TODO: Implement report generation logic
    Alert.alert("Success", "Report generated successfully");
  };

  const handleShareReport = (report) => {
    // TODO: Implement share functionality
    Alert.alert("Share", `Sharing ${report.name}`);
  };

  const reportTypes = ["Monthly Consumption", "Yearly Consumption", "Payment History", "Usage Analysis"];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Menu width={18} height={18} fill="#202d59" />
        </Pressable>

        <View style={styles.logoWrapper}>
          <AnimatedRings />
          <Logo variant="blue" size="medium" />
        </View>

        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Notification width={18} height={18} fill="#202d59" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Title */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Reports</Text>
        </View>

        {/* Filter Card */}
        <View style={styles.filterCard}>
          {/* Select Type */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Select Type</Text>
            <Pressable 
              style={styles.filterInput}
              onPress={() => setShowTypeDropdown(!showTypeDropdown)}
            >
              <Text style={styles.filterInputText}>{filterType}</Text>
              <DropDownIcon width={16} height={16} fill={COLORS.primaryFontColor} />
            </Pressable>
            
            {/* Dropdown Modal */}
            {showTypeDropdown && (
              <Modal
                visible={showTypeDropdown}
                transparent
                animationType="fade"
                onRequestClose={() => setShowTypeDropdown(false)}
              >
                <Pressable 
                  style={styles.dropdownOverlay}
                  onPress={() => setShowTypeDropdown(false)}
                >
                  <View style={styles.dropdownContent}>
                    {reportTypes.map((type) => (
                      <Pressable
                        key={type}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFilterType(type);
                          setShowTypeDropdown(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          filterType === type && styles.dropdownItemTextSelected
                        ]}>
                          {type}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Pressable>
              </Modal>
            )}
          </View>

          {/* Select Date */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Select Date</Text>
            <View style={styles.dateRow}>
              <View style={styles.dateInputContainer}>
                <DatePicker
                  placeholder="dd-mm-yyyy"
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  style={styles.datePickerInput}
                  containerStyle={styles.datePickerContainer}
                  textStyle={styles.datePickerText}
                  dateFormat="dd-mm-yyyy"
                />
              </View>
              <Text style={styles.dateSeparator}>-</Text>
              <View style={styles.dateInputContainer}>
                <DatePicker
                  placeholder="dd-mm-yyyy"
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  style={styles.datePickerInput}
                  containerStyle={styles.datePickerContainer}
                  textStyle={styles.datePickerText}
                  dateFormat="dd-mm-yyyy"
                />
              </View>
            </View>
          </View>

          {/* Get Report Button */}
          <TouchableOpacity
            style={styles.getReportButton}
            onPress={handleGetReport}
            activeOpacity={0.7}
          >
            <Text style={styles.getReportButtonText}>Get Report</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Reports Card */}
        <View style={styles.recentReportsCard}>
          <Text style={styles.recentReportsTitle}>Recent Reports</Text>
          <View style={styles.reportsList}>
            {recentReports.map((report) => (
              <View key={report.id} style={styles.reportItem}>
                <View style={styles.reportItemLeft}>
                  <View style={styles.documentIcon}>
                    {/* <Text style={styles.documentIconText}>📄</Text> */}
                    <DocumentIcon width={18} height={18} fill={COLORS.primaryFontColor} />
                  </View>
                  <Text style={styles.reportItemText}>{report.name}</Text>
                </View>
                <Pressable 
                  style={styles.shareButton}
                  onPress={() => handleShareReport(report)}
                >
                  <ShareIcon width={18} height={18} fill={COLORS.primaryFontColor} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      
      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} />
    </View>
  );
};

export default Reports;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF8F0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 20,
    paddingHorizontal: 30,
  },
  headerButton: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
    gap: 20,
  },
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    padding: 15,
    gap: 10,
  },
  filterSection: {
    gap: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.primaryFontColor,
  },
  filterInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterInputText: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    flex: 1,
  },
  placeholderText: {
    color: "#9CA3AF",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  datePickerContainer: {
    position: 'relative',
  },
  datePickerInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  datePickerText: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    textAlign: "center",
    flex: 1,
  },
  dateSeparator: {
    fontSize: 16,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    alignSelf: 'center',
  },
  getReportButton: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 5,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  getReportButtonText: {
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  recentReportsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    padding: 20,
    gap: 16,
  },
  recentReportsTitle: {
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  reportsList: {
    gap: 10,
  },
  reportItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "#FAFAFA",
    borderRadius: 5,
    paddingHorizontal: 16,
  },
  reportItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  documentIcon: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  documentIconText: {
    fontSize: 20,
  },
  reportItemText: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    flex: 1,
  },
  shareButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    minWidth: 200,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownItemText: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
  },
  dropdownItemTextSelected: {
    fontFamily: "Manrope-SemiBold",
    color: COLORS.secondaryColor,
  },
});
