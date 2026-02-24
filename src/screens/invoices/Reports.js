import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Pressable, Modal, Alert, ActivityIndicator, Share, FlatList } from "react-native";
import React, { useState, useEffect } from "react";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import BottomNavigation from "../../components/global/BottomNavigation";
import Menu from "../../../assets/icons/bars.svg";
import MenuWhite from "../../../assets/icons/menuBarWhite.svg";
import Notification from "../../../assets/icons/notification.svg";
import NotificationWhite from "../../../assets/icons/NotificationWhite.svg";
import Logo from "../../components/global/Logo";
import AnimatedRings from "../../components/global/AnimatedRings";
import { StatusBar } from "expo-status-bar";
import DropDownIcon from "../../../assets/icons/dropdownArrow.svg";
import ShareIcon from "../../../assets/icons/share.svg";
import DatePicker from "../../components/global/DatePicker";
import DocumentIcon from "../../../assets/icons/document.svg";
import { getUser } from "../../utils/storage";
import { apiClient } from "../../services/apiClient";
import { formatDDMMYYYY, formatYYYYMMDD } from "../../utils/dateUtils";
import * as XLSX from "xlsx";
import { isDemoUser, getDemoReportResponse, getDemoRecentReports } from "../../constants/demoData";


const Reports = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  const [filterType, setFilterType] = useState("Daily Consumption");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [recentReports, setRecentReports] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);

  const reportTypeToApi = {
    "Daily Consumption": "daily-consumption",
    "Monthly Consumption": "monthly-consumption",
    "Payment History": "payment-history",
  };

  const reportTypes = ["Daily Consumption", "Monthly Consumption", "Payment History"];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getUser();
      const identifier = user?.identifier;
      if (cancelled || !identifier || !isDemoUser(identifier)) return;
      setRecentReports(getDemoRecentReports(identifier));
    })();
    return () => { cancelled = true; };
  }, []);

  const handleGetReport = async () => {
    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select both start and end dates");
      return;
    }
    const user = await getUser();
    const identifier = user?.identifier;
    if (!identifier) {
      Alert.alert("Error", "Please sign in to generate reports");
      return;
    }
    const isMonthlyReport = filterType === "Monthly Consumption";
    const startStr = formatYYYYMMDD(startDate);
    const endForApi = isMonthlyReport
      ? new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0)
      : endDate;
    const endStr = formatYYYYMMDD(endForApi);
    const reportType = reportTypeToApi[filterType] ?? "daily-consumption";

    setReportError(null);
    setReportLoading(true);
    try {
      let result;
      if (isDemoUser(identifier)) {
        result = getDemoReportResponse(identifier, startStr, endStr, reportType);
      } else {
        result = await apiClient.getConsumerReport(identifier, startStr, endStr, reportType);
      }
      if (result?.success && result?.data != null) {
        const reportLabel = filterType.replace(/\s+/g, " ");
        const dateRangeLabel = isMonthlyReport
          ? `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()} - ${monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`
          : `${formatDDMMYYYY(startDate)} - ${formatDDMMYYYY(endDate)}`;
        const reportName = `${reportLabel} (${dateRangeLabel}).pdf`;
        setRecentReports((prev) => [
          { id: Date.now(), name: reportName, data: result.data, reportType: filterType },
          ...prev,
        ].slice(0, 10));
        Alert.alert("Success", "Report generated successfully");
      } else {
        const msg = result?.message || "Failed to load report";
        setReportError(msg);
        Alert.alert("Report failed", msg);
      }
    } catch (err) {
      const msg = err?.message || "Something went wrong";
      setReportError(msg);
      Alert.alert("Error", msg);
    } finally {
      setReportLoading(false);
    }
  };

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const labelToMonthYYYYMM = (label, fallbackYear) => {
    if (!label) return "";
    const s = String(label).trim();
    if (/^\d{4}-\d{2}$/.test(s)) return s;
    const year = fallbackYear ?? new Date().getFullYear();
    const i = monthNames.findIndex((m) => s.startsWith(m) || s.toLowerCase().startsWith(m.toLowerCase()));
    if (i !== -1) return `${year}-${String(i + 1).padStart(2, "0")}`;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return s;
  };

  const isMonthlyShape = (arr) => Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "object" && arr[0] != null && ("month" in arr[0] || "monthly" in arr[0]);

  const getReportSheetData = (report) => {
    const raw = report?.data;
    const rawType = report?.reportType || (report?.name?.toLowerCase().includes("payment") ? "Payment" : report?.name?.toLowerCase().includes("monthly") ? "Monthly" : "Daily");
    const type = rawType?.toLowerCase().includes("monthly") ? "Monthly" : rawType?.toLowerCase().includes("payment") ? "Payment" : "Daily";
    if (!raw) return null;

    if (type === "Monthly") {
      let months = [];
      let values = [];
      const dataArray = Array.isArray(raw) ? raw : raw?.data;
      if (isMonthlyShape(dataArray)) {
        for (const r of dataArray) {
          const m = r.month ?? r.monthly ?? r.date ?? r.label ?? "";
          months.push(typeof m === "string" && /^\d{4}-\d{2}$/.test(m) ? m : labelToMonthYYYYMM(m));
          values.push(Number(r.consumption ?? r.value ?? r.kwh ?? 0) || 0);
        }
      } else if (raw?.chartData?.monthly?.xAxisData?.length && raw.chartData.monthly.seriesData?.[0]?.data?.length) {
        const chart = raw.chartData.monthly;
        const data = chart.seriesData[0].data;
        const isCumulative = data.length > 1 && data.every((v, i) => i === 0 || v >= data[i - 1]);
        const consumptions = isCumulative ? data.map((v, i) => (i === 0 ? v : (v || 0) - (data[i - 1] || 0))) : data;
        const year = raw.dateRange?.startDate ? new Date(raw.dateRange.startDate).getFullYear() : new Date().getFullYear();
        months = chart.xAxisData.map((l) => labelToMonthYYYYMM(l, year));
        values = consumptions;
      } else if (Array.isArray(raw.consumption) && raw.consumption.length > 0) {
        for (const item of raw.consumption) {
          const d = item.date ?? item.dateTime ?? item.month ?? item.label;
          months.push(labelToMonthYYYYMM(d));
          values.push(Number(item.consumption ?? item.value ?? item.kwh ?? 0) || 0);
        }
      } else if (Array.isArray(raw.data) && !isMonthlyShape(raw.data)) {
        for (const r of raw.data) {
          months.push(labelToMonthYYYYMM(r.date ?? r.dateTime ?? r.month ?? r.label));
          values.push(Number(r.consumption ?? r.value ?? r.kwh ?? 0) || 0);
        }
      } else if (Array.isArray(raw.dates) && Array.isArray(raw.consumption)) {
        months = raw.dates.map((d) => labelToMonthYYYYMM(d));
        values = raw.consumption.map((v) => Number(v) || 0);
      }
      if (months.length > 0) return [["Month", "Consumption"], ...months.map((m, i) => [m, values[i] ?? 0])];
    }

    if (type === "Daily") {
      let dates = [];
      let values = [];
      const chart = raw.chartData?.daily;
      if (chart?.xAxisData?.length && chart?.seriesData?.[0]?.data?.length) {
        dates = chart.xAxisData;
        values = chart.seriesData[0].data;
      } else if (Array.isArray(raw.consumption) && raw.consumption.length > 0 && !isMonthlyShape(raw.consumption)) {
        for (const item of raw.consumption) {
          dates.push(item.date ?? item.dateTime ?? item.day ?? item.label ?? "");
          values.push(Number(item.consumption ?? item.value ?? item.kwh ?? 0) || 0);
        }
      } else if (Array.isArray(raw.data) && !isMonthlyShape(raw.data)) {
        dates = raw.data.map((r) => r.date ?? r.dateTime ?? r.day ?? r.label ?? "");
        values = raw.data.map((r) => Number(r.consumption ?? r.value ?? r.kwh ?? 0) || 0);
      } else if (Array.isArray(raw) && !isMonthlyShape(raw)) {
        dates = raw.map((r) => r.date ?? r.dateTime ?? r.day ?? r.label ?? "");
        values = raw.map((r) => Number(r.consumption ?? r.value ?? r.kwh ?? 0) || 0);
      } else if (Array.isArray(raw.dates) && Array.isArray(raw.consumption)) {
        dates = raw.dates;
        values = raw.consumption.map((v) => Number(v) || 0);
      }
      if (dates.length > 0) return [["Date", "Consumption"], ...dates.map((d, i) => [d, values[i] ?? 0])];
    }

    if (type === "Payment") {
      const arr = Array.isArray(raw.data) ? raw.data : Array.isArray(raw.payments) ? raw.payments : [];
      if (arr.length > 0) {
        const first = arr[0];
        const keys = typeof first === "object" && first !== null ? Object.keys(first) : [];
        const headers = keys.length ? keys : ["Date", "Amount", "Description"];
        const rows = keys.length ? arr.map((r) => headers.map((h) => r[h] ?? "")) : arr.map((r) => (typeof r === "object" ? Object.values(r) : [r]));
        return [headers, ...rows];
      }
      return [["Date", "Amount", "Description"]];
    }

    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
    if (arr.length > 0 && typeof arr[0] === "object" && arr[0] != null) {
      const keys = Object.keys(arr[0]);
      const useMonthlyHeaders = isMonthlyShape(arr) || type === "Monthly" || (keys.length === 2 && (keys.includes("month") || keys.includes("consumption")));
      const headers = useMonthlyHeaders ? ["Month", "Consumption"] : keys.length ? keys : ["Date", "Consumption"];
      const rows = useMonthlyHeaders ? arr.map((r) => [r.month ?? r.monthly ?? r.date ?? "", r.consumption ?? r.value ?? r.kwh ?? ""]) : arr.map((r) => headers.map((h) => (r[h] != null ? r[h] : "")));
      return [headers, ...rows];
    }
    return null;
  };

  const buildReportAsCsv = (report) => {
    const sheetData = getReportSheetData(report);
    if (!sheetData || sheetData.length === 0) return null;
    const escape = (v) => (v == null ? "" : String(v).replace(/"/g, '""'));
    const row = (arr) => arr.map((c) => `"${escape(c)}"`).join(",");
    return sheetData.map((r) => row(r)).join("\n");
  };

  const buildReportAsXlsx = (report) => {
    const sheetData = getReportSheetData(report);
    if (!sheetData || sheetData.length === 0) return null;
    try {
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Report");
      return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
    } catch (e) {
      return null;
    }
  };

  const buildReportShareContent = (report) => {
    const header = [
      "Best Infra – Consumer Report",
      "────────────────────────────",
      `Report: ${report.name}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
    ].join("\n");
    if (!report.data) return header + "Generate this report using the date range and \"Get Report\" on the Reports screen.";
    if (typeof report.data === "string") return header + report.data;
    if (Array.isArray(report.data)) {
      const lines = report.data.map((row, i) => (typeof row === "object" ? JSON.stringify(row) : String(row)));
      return header + lines.join("\n");
    }
    return header + JSON.stringify(report.data, null, 2);
  };

  const handleShareReport = async (report) => {
    try {
      const safeName = (report.name || "Report").replace(/[^a-zA-Z0-9._\-\s]/g, "_").replace(/\s+/g, "_").slice(0, 80);
      const xlsxBase64 = buildReportAsXlsx(report);
      if (xlsxBase64) {
        const fileName = `BestInfra_${safeName}.xlsx`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, xlsxBase64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Share Report (Excel)",
          });
        } else {
          const csv = buildReportAsCsv(report);
          await Share.share({ message: csv || "No data", title: report.name || "Report" });
        }
        return;
      }
      let csv = buildReportAsCsv(report);
      const hasData = report?.data != null;
      if (hasData && !csv && typeof report.data === "object") {
        const sheetData = getReportSheetData(report);
        if (sheetData?.length) {
          const escape = (v) => (v == null ? "" : String(v).replace(/"/g, '""'));
          const row = (arr) => arr.map((c) => `"${escape(c)}"`).join(",");
          csv = sheetData.map((r) => row(r)).join("\n");
        }
      }
      const useCsv = !!csv;
      const ext = useCsv ? "csv" : "txt";
      const fileName = `BestInfra_${safeName}.${ext}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const content = useCsv ? "\uFEFF" + csv : buildReportShareContent(report);

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: useCsv ? "text/csv" : "text/plain",
          dialogTitle: useCsv ? "Share Report" : "Share Report",
        });
      } else {
        await Share.share({
          message: content,
          title: report.name || "Report",
        });
      }
    } catch (err) {
      const msg = err?.message || "Sharing failed";
      Alert.alert("Share failed", msg);
    }
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style={isDark ? "dark" : "dark"} />
      
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={[styles.headerButton, isDark && { backgroundColor: '#1A1F2E' }]}
          onPress={() => navigation.goBack()}
        >
          {isDark ? (
            <MenuWhite width={18} height={18} />
          ) : (
            <Menu width={18} height={18} fill="#202d59" />
          )}
        </Pressable>

        <View style={styles.logoWrapper}>
          <AnimatedRings />
          <Logo variant={isDark ? "white" : "blue"} size="medium" />
        </View>

        <Pressable
          style={[styles.headerButton, isDark && { backgroundColor: '#1A1F2E' }]}
          onPress={() => navigation.navigate("Notifications")}
        >
          {isDark ? (
            <NotificationWhite width={18} height={18} />
          ) : (
            <Notification width={18} height={18} fill="#202d59" />
          )}
        </Pressable>
      </View>

      <ScrollView
        style={[styles.scrollContainer, isDark && { backgroundColor: themeColors.screen }]}
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

          {/* Select Date / Select Month (for Monthly Consumption) */}
          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>
              {filterType === "Monthly Consumption" ? "Select Month" : "Select Date"}
            </Text>
            <View style={styles.dateRow}>
              <View style={styles.dateInputContainer}>
                <DatePicker
                  placeholder={filterType === "Monthly Consumption" ? "mm-yyyy" : "dd-mm-yyyy"}
                  value={startDate}
                  onChange={(date) => setStartDate(date)}
                  style={styles.datePickerInput}
                  containerStyle={styles.datePickerContainer}
                  textStyle={styles.datePickerText}
                  dateFormat="dd-mm-yyyy"
                  mode={filterType === "Monthly Consumption" ? "month" : "date"}
                />
              </View>
              <Text style={styles.dateSeparator}>-</Text>
              <View style={styles.dateInputContainer}>
                <DatePicker
                  placeholder={filterType === "Monthly Consumption" ? "mm-yyyy" : "dd-mm-yyyy"}
                  value={endDate}
                  onChange={(date) => setEndDate(date)}
                  style={styles.datePickerInput}
                  containerStyle={styles.datePickerContainer}
                  textStyle={styles.datePickerText}
                  dateFormat="dd-mm-yyyy"
                  mode={filterType === "Monthly Consumption" ? "month" : "date"}
                />
              </View>
            </View>
          </View>

          {reportError ? (
            <Text style={styles.reportErrorText}>{reportError}</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.getReportButton, reportLoading && styles.getReportButtonDisabled]}
            onPress={handleGetReport}
            activeOpacity={0.7}
            disabled={reportLoading}
          >
            {reportLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.getReportButtonText}>Get Report</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Recent Reports Card */}
        <View style={styles.recentReportsCard}>
          <Text style={styles.recentReportsTitle}>Recent Reports</Text>
          <FlatList
            data={recentReports}
            scrollEnabled={false}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item: report }) => (
              <View style={styles.reportItem}>
                <View style={styles.reportItemLeft}>
                  <View style={styles.documentIcon}>
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
            )}
            initialNumToRender={10}
          />
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
    zIndex: 99,
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
  getReportButtonDisabled: {
    opacity: 0.7,
  },
  reportErrorText: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "#DC2626",
    marginTop: 4,
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
