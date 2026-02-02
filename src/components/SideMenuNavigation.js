import { Pressable, StyleSheet, Text, View, Modal, TouchableOpacity, Switch } from "react-native";
import React, { useState, useEffect, useContext } from "react";
import { COLORS } from "../constants/colors";
import Button from "./global/Button";
import Slider from "@react-native-community/slider";
import DashboardIcon from "../../assets/icons/dashboardMenu.svg";
import ActiveDashboard from "../../assets/icons/activeDashboard.svg";
import UsageIcon from "../../assets/icons/usageMenu.svg";
import ActiveUsage from "../../assets/icons/activeUsage.svg";
import PaymentsIcon from "../../assets/icons/paymentsMenu.svg";
import ActivePayments from "../../assets/icons/activePayments.svg";
import ReportsIcon from "../../assets/icons/reportsIcon.svg";
import ActiveReports from "../../assets/icons/activeReportsIcon.svg";
import TicketsIcon from "../../assets/icons/ticketsMenu.svg";
import ActiveTickets from "../../assets/icons/activeTickets.svg";
import AlertsIcon from "../../assets/icons/bellWhite.svg";
import ActiveAlerts from "../../assets/icons/activeBellWhite.svg";
import SettingsIcon from "../../assets/icons/settingMenu.svg";
import ActiveSettings from "../../assets/icons/activeSettings.svg";
import LogoutIcon from "../../assets/icons/logoutMenu.svg";
import CrossIcon from "../../assets/icons/cross.svg";
import { logoutUser } from "../utils/storage";
import { TabContext } from "../context/TabContext";
import { useNavigationState } from "@react-navigation/native";

const SideMenuNavigation = ({ navigation }) => {
  const { activeItem, setActiveItem } = useContext(TabContext);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Alerts settings state
  const [usageThreshold, setUsageThreshold] = useState(500);
  const [billDueReminders, setBillDueReminders] = useState(true);
  const [paymentConfirmations, setPaymentConfirmations] = useState(true);
  const [billAmountAlerts, setBillAmountAlerts] = useState(true);
  const [tamperAlerts, setTamperAlerts] = useState(true);

  // Get current route to sync sidebar highlighting
  const currentRoute = useNavigationState(state => 
    state?.routes[state?.index]?.name
  );

  // Sync activeItem with current route on mount and route changes
  useEffect(() => {
    if (currentRoute) {
      if (currentRoute === "PostPaidDashboard" || currentRoute === "Dashboard") {
        setActiveItem("Dashboard");
      } else if (currentRoute === "Usage") {
        setActiveItem("Usage");
      } else if (currentRoute === "PostPaidRechargePayments" || currentRoute === "Payments") {
        setActiveItem("Payments");
      } else if (currentRoute === "Invoices") {
        setActiveItem("Reports");
      } else if (currentRoute === "Tickets") {
        setActiveItem("Tickets");
      } else if (currentRoute === "Settings") {
        setActiveItem("Settings");
      }
    }
  }, [currentRoute, setActiveItem]);

  const handleLogout = async () => {
    try {
      console.log('🔄 User initiated logout from side menu...');
      await logoutUser();
      navigation.reset({
        index: 0,
        routes: [{ name: "Splash" }],
      });
      console.log('✅ Logout complete - navigated to Splash');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: "Splash" }],
      });
    }
  };

  const handleLogoutPress = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutConfirm(false);
    await handleLogout();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleAlertsPress = () => {
    setShowAlertsModal(true);
  };

  const handleSaveAlertSettings = () => {
    console.log('Saving alert settings:', {
      usageThreshold,
      billDueReminders,
      paymentConfirmations,
      billAmountAlerts,
      tamperAlerts
    });
    setShowAlertsModal(false);
  };

  return (
    <>
      <View style={styles.Topmenubar}>
        {/* Dashboard */}
        <Pressable
          style={styles.flex}
          onPress={() => {
            setActiveItem("Dashboard");
            navigation.navigate("PostPaidDashboard");
          }}
        >
          {activeItem === "Dashboard" ? (
            <ActiveDashboard width={18} height={18} style={[styles.iconStyle, styles.activeIcon]} />
          ) : (
            <DashboardIcon width={18} height={18} style={styles.iconStyle} />
          )}
          <Text style={[styles.menuText, activeItem === "Dashboard" && styles.activeText]}>
            Dashboard
          </Text>
        </Pressable>

        {/* Usage */}
        <Pressable
          style={styles.flex}
          onPress={() => {
            setActiveItem("Usage");
            navigation.navigate("Usage");
          }}
        >
          {activeItem === "Usage" ? (
            <ActiveUsage width={18} height={18} style={[styles.iconStyle, styles.activeIcon]} />
          ) : (
            <UsageIcon width={18} height={18} style={styles.iconStyle} />
          )}
          <Text style={[styles.menuText, activeItem === "Usage" && styles.activeText]}>
            Usage
          </Text>
        </Pressable>

        {/* Payments */}
        <Pressable
          style={styles.flex}
          onPress={() => {
            setActiveItem("Payments");
            navigation.navigate("PostPaidRechargePayments");
          }}
        >
          {activeItem === "Payments" ? (
            <ActivePayments width={18} height={18} style={[styles.iconStyle, styles.activeIcon]} />
          ) : (
            <PaymentsIcon width={18} height={18} style={styles.iconStyle} />
          )}
          <Text style={[styles.menuText, activeItem === "Payments" && styles.activeText]}>
            Payments
          </Text>
        </Pressable>

        {/* Reports */}
        <Pressable
          style={styles.flex}
          onPress={() => {
            setActiveItem("Reports");
            navigation.navigate("Invoices");
          }}
        >
          {activeItem === "Reports" ? (
            <ActiveReports width={18} height={18} style={[styles.iconStyle, styles.activeIcon]} />
          ) : (
            <ReportsIcon width={18} height={18} style={styles.iconStyle} />
          )}
          <Text style={[styles.menuText, activeItem === "Reports" && styles.activeText]}>
            Reports
          </Text>
        </Pressable>

        {/* Tickets */}
        <Pressable
          style={styles.flex}
          onPress={() => {
            setActiveItem("Tickets");
            navigation.navigate("Tickets");
          }}
        >
          {activeItem === "Tickets" ? (
            <ActiveTickets width={18} height={18} style={[styles.iconStyle, styles.activeIcon]} />
          ) : (
            <TicketsIcon width={18} height={18} style={styles.iconStyle} />
          )}
          <Text style={[styles.menuText, activeItem === "Tickets" && styles.activeText]}>
            Tickets
          </Text>
        </Pressable>

        {/* Alerts - Opens Modal */}
        <Pressable
          style={styles.flex}
          onPress={handleAlertsPress}
        >
          {showAlertsModal ? (
            <ActiveAlerts width={18} height={18} style={[styles.iconStyle, styles.activeIcon]} />
          ) : (
            <AlertsIcon width={18} height={18} style={styles.iconStyle} />
          )}
          <Text style={[styles.menuText, showAlertsModal && styles.activeText]}>
            Alerts
          </Text>
        </Pressable>
      </View>

      <View style={styles.Bottommenubar}>
        {/* Settings */}
        <Pressable
          style={styles.flex}
          onPress={() => {
            setActiveItem("Settings");
            navigation.navigate("Settings");
          }}
        >
          {activeItem === "Settings" ? (
            <ActiveSettings width={18} height={18} style={[styles.iconStyle, styles.activeIcon]} />
          ) : (
            <SettingsIcon width={18} height={18} style={styles.iconStyle} />
          )}
          <Text style={[styles.menuText, activeItem === "Settings" && styles.activeText]}>
            Settings
          </Text>
        </Pressable>

        {/* Logout */}
        <Button
          title="Logout"
          variant="ghost"
          size="small"
          onPress={handleLogoutPress}
          style={styles.logoutButton}
          textStyle={styles.logoutText}
        >
          <LogoutIcon width={18} height={18} style={styles.logoutIcon} />
        </Button>

        <View style={styles.flex}>
          <Text style={styles.versionText}>Version 1.0.26</Text>
        </View>
      </View>

      {/* Alerts Modal */}
      <Modal
        visible={showAlertsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlertsModal(false)}
      >
        <View style={styles.alertsModalOverlay}>
          <View style={styles.alertsModalCard}>
            {/* Header */}
            <View style={styles.alertsModalHeader}>
              <Text style={styles.alertsModalTitle}>Alerts</Text>
              <TouchableOpacity 
                onPress={() => setShowAlertsModal(false)}
                style={styles.closeButton}
              >
                <CrossIcon width={20} height={20} />
              </TouchableOpacity>
            </View>

            {/* Usage Threshold Alert */}
            <View style={styles.thresholdSection}>
              <Text style={styles.thresholdLabel}>Usage Threshold Alert</Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1000}
                  step={50}
                  value={usageThreshold}
                  onValueChange={setUsageThreshold}
                  minimumTrackTintColor={COLORS.secondaryColor}
                  maximumTrackTintColor="#E5E7EB"
                  thumbTintColor={COLORS.brandBlueColor}
                />
              </View>
              <Text style={styles.thresholdValue}>{Math.round(usageThreshold)} kWh</Text>
            </View>

            {/* Toggle Settings */}
            <View style={styles.toggleSection}>
              {/* Bill Due Reminders */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Bill Due Reminders</Text>
                  <Text style={styles.toggleSubtitle}>3 days before due date</Text>
                </View>
                <Switch
                  value={billDueReminders}
                  onValueChange={setBillDueReminders}
                  trackColor={{ false: "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>

              {/* Payment Confirmations */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Payment Confirmations</Text>
                  <Text style={styles.toggleSubtitle}>Instant notification</Text>
                </View>
                <Switch
                  value={paymentConfirmations}
                  onValueChange={setPaymentConfirmations}
                  trackColor={{ false: "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>

              {/* Bill Amount Alerts */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Bill Amount Alerts</Text>
                  <Text style={styles.toggleSubtitle}>When bill exceeds ₹5000</Text>
                </View>
                <Switch
                  value={billAmountAlerts}
                  onValueChange={setBillAmountAlerts}
                  trackColor={{ false: "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>

              {/* Tamper Alerts */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.toggleTitle}>Tamper Alerts</Text>
                  <Text style={styles.toggleSubtitle}>Immediate notification</Text>
                </View>
                <Switch
                  value={tamperAlerts}
                  onValueChange={setTamperAlerts}
                  trackColor={{ false: "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
              onPress={handleSaveAlertSettings}
            >
              <Text style={styles.saveButtonText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout confirmation modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={handleCancelLogout}
      >
        <View style={styles.logoutModalOverlay}>
          <View style={styles.logoutModalCard}>
            <Text style={styles.logoutModalTitle}>Logout</Text>
            <Text style={styles.logoutModalMessage}>
              Are you sure you want to logout?
            </Text>

            <View style={styles.logoutModalButtonsRow}>
              <TouchableOpacity
                style={styles.logoutModalCancelButton}
                activeOpacity={0.8}
                onPress={handleCancelLogout}
              >
                <Text style={styles.logoutModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutModalConfirmButton}
                activeOpacity={0.8}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.logoutModalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SideMenuNavigation;

const styles = StyleSheet.create({
  Topmenubar: {},
  Bottommenubar: {
    paddingBottom: 30,
  },
  flex: {
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  logoutText: {
    fontSize: 16,
    fontFamily: "Manrope-Medium",
    color: COLORS.secondaryFontColor,
    opacity: 0.7,
  },
  logoutIcon: {
    marginRight: 20,
    opacity: 0.5,
  },
  activeText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    opacity: 1,
  },
  menuText: {
    color: COLORS.secondaryFontColor,
    opacity: 0.6,
    fontSize: 16,
    fontFamily: "Manrope-Medium",
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: "#89A1F3",
  },
  iconStyle: {
    marginRight: 20,
    opacity: 0.5,
  },
  activeIcon: {
    opacity: 1,
    color: COLORS.secondaryColor,
  },
  // Alerts Modal Styles
  alertsModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertsModalCard: {
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  alertsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  alertsModalTitle: {
    fontSize: 18,
    fontFamily: "Manrope-Bold",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  thresholdSection: {
    marginBottom: 16,
  },
  thresholdLabel: {
    fontSize: 13,
    fontFamily: "Manrope-Medium",
    color: "#6B7280",
    marginBottom: 12,
  },
  sliderContainer: {
    marginHorizontal: 0,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  thresholdValue: {
    fontSize: 26,
    fontFamily: "Manrope-Bold",
    color: COLORS.brandBlueColor,
    textAlign: "center",
    marginTop: 8,
  },
  toggleSection: {
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: "#1F2937",
  },
  toggleSubtitle: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "#9CA3AF",
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: COLORS.brandBlueColor,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  // Logout Modal Styles
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutModalCard: {
    width: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  logoutModalTitle: {
    fontSize: 20,
    fontFamily: "Manrope-Bold",
    color: "#000000",
    marginBottom: 8,
  },
  logoutModalMessage: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: "#111827",
    marginBottom: 24,
  },
  logoutModalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutModalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logoutModalCancelText: {
    fontSize: 16,
    fontFamily: "Manrope-Medium",
    color: "#111827",
  },
  logoutModalConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EF4444",
  },
  logoutModalConfirmText: {
    fontSize: 16,
    fontFamily: "Manrope-Medium",
    color: "#FFFFFF",
  },
});
