import { Pressable, StyleSheet, Text, View, Modal, TouchableOpacity, Switch, Animated } from "react-native";
import React, { useState, useEffect, useContext, useRef } from "react";
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
import LogoutButton from "../../assets/icons/signOutRed.svg";
import CrossIcon from "../../assets/icons/cross.svg";
import { logoutUser } from "../utils/storage";
import { TabContext } from "../context/TabContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigationState } from "@react-navigation/native";
import { getAlertPreferences, setAlertPreferences } from "../services/pushNotificationService";

const SideMenuNavigation = ({ navigation }) => {
  const { activeItem, setActiveItem } = useContext(TabContext);
  const { getScaledFontSize, isDark, colors: themeColors } = useTheme();
  const scaled = {
    menu: getScaledFontSize(16),
    version: getScaledFontSize(12),
    modalTitle: getScaledFontSize(18),
    modalLabel: getScaledFontSize(16),
    modalTitleBig: getScaledFontSize(26),
    modalTitleMid: getScaledFontSize(18),
    toggleTitle: getScaledFontSize(14),
    toggleSub: getScaledFontSize(12),
    modalMessage: getScaledFontSize(14),
    modalButton: getScaledFontSize(16),
    logoutModalTitle: getScaledFontSize(20),
  };
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Alerts settings state
  const [usageThreshold, setUsageThreshold] = useState(500);
  const sliderThumbAnim = useRef(new Animated.Value(500)).current;
  const sliderRafRef = useRef(null);
  const [billDueReminders, setBillDueReminders] = useState(true);
  const [paymentConfirmations, setPaymentConfirmations] = useState(true);
  const [billAmountAlerts, setBillAmountAlerts] = useState(true);
  const [tamperAlerts, setTamperAlerts] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);


  const currentRoute = useNavigationState(state => 
    state?.routes[state?.index]?.name
  );

  useEffect(() => {
    if (currentRoute) {
      if (currentRoute === "PostPaidDashboard") {
        setActiveItem("PostPaidDashboard");
      } else if (currentRoute === "Usage") {
        setActiveItem("Usage");
      } else if (currentRoute === "PostPaidRechargePayments" || currentRoute === "Payments") {
        setActiveItem("Payments");
      } else if (currentRoute === "Invoices") {
        setActiveItem("Invoices");
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


  useEffect(() => {
    if (showAlertsModal) sliderThumbAnim.setValue(usageThreshold);
  }, [showAlertsModal]);

  const handleAlertsPress = () => {
    setShowAlertsModal(true);
  };

  useEffect(() => {
    if (!showAlertsModal) return;
    let mounted = true;
    getAlertPreferences().then((prefs) => {
      if (!mounted) return;
      setBillDueReminders(prefs.billDueReminders !== false);
      setPaymentConfirmations(prefs.paymentConfirmations !== false);
      setBillAmountAlerts(prefs.billAmountAlerts !== false);
      setTamperAlerts(prefs.tamperAlerts !== false);
      setEmailNotifications(prefs.emailNotifications !== false);
    });
    return () => { mounted = false; };
  }, [showAlertsModal]);

  const handleSaveAlertSettings = async () => {
    const prefs = {
      billDueReminders,
      paymentConfirmations,
      billAmountAlerts,
      tamperAlerts,
      emailNotifications,
    };
    await setAlertPreferences(prefs);
    setShowAlertsModal(false);
  };

  return (
    <>
      <View style={styles.Topmenubar}>

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
          <Text style={[styles.menuText, activeItem === "Dashboard" && styles.activeText, { fontSize: scaled.menu }]}>
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
          <Text style={[styles.menuText, activeItem === "Usage" && styles.activeText, { fontSize: scaled.menu }]}>
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
          <Text style={[styles.menuText, activeItem === "Payments" && styles.activeText, { fontSize: scaled.menu }]}>
            Payments
          </Text>
        </Pressable>

        {/* Reports */}
        <Pressable
          style={styles.flex}
          onPress={() => {
            setActiveItem("Reports");
            navigation.navigate("Reports");
          }}
        >
          {activeItem === "Reports" ? (
            <ActiveReports width={18} height={18} style={[styles.iconStyle, styles.activeIcon]} />
          ) : (
            <ReportsIcon width={18} height={18} style={styles.iconStyle} />
          )}
          <Text style={[styles.menuText, activeItem === "Reports" && styles.activeText, { fontSize: scaled.menu }]}>
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
          <Text style={[styles.menuText, { fontSize: scaled.menu }, activeItem === "Tickets" && styles.activeText]}>
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
          <Text style={[styles.menuText, showAlertsModal && styles.activeText, { fontSize: scaled.menu }]}>
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
          <Text style={[styles.menuText, activeItem === "Settings" && styles.activeText, { fontSize: scaled.menu }]}>
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
          textStyle={[styles.logoutText, { fontSize: scaled.menu }]}
        >
          <LogoutIcon width={15} height={15} style={styles.logoutIcon} />
        </Button>

        <View style={styles.flex}>
          <Text style={[styles.versionText, { fontSize: scaled.version }]}>Version 1.0.26</Text>
        </View>
      </View>

      {/* Alerts Modal */}
      <Modal
        visible={showAlertsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAlertsModal(false)}
      >
        <View style={[styles.alertsModalOverlay, isDark && styles.alertsModalOverlayDark]}>
          <View style={[styles.alertsModalCard, isDark && { backgroundColor: themeColors.card }]}>
            {/* Header */}
            <View style={styles.alertsModalHeader}>
              <Text style={[styles.alertsModalTitle, { fontSize: scaled.modalTitle }, isDark && { color: themeColors.textPrimary }]}>Alerts</Text>
              <TouchableOpacity 
                onPress={() => setShowAlertsModal(false)}
                style={styles.closeButton}
              >
                <CrossIcon width={20} height={20} fill={isDark ? themeColors.textPrimary : "#1F2937"} />
              </TouchableOpacity>
            </View>

            {/* Usage Threshold Alert */}
            {/* <View style={styles.thresholdSection}>
              <Text style={[styles.thresholdLabel, { fontSize: scaled.modalLabel }, isDark && { color: themeColors.textSecondary }]}>Usage Threshold Alert</Text>
              <View style={styles.sliderContainer}>
                <View style={[styles.sliderTrackBg, isDark && { backgroundColor: themeColors.progressBarTrack }]} />
                <View
                  style={[
                    styles.sliderTrackFilled,
                    { width: `${(usageThreshold / 1000) * 100}%` },
                    isDark && { backgroundColor: themeColors.brandBlue },
                  ]}
                />
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.sliderThumb,
                    isDark && { backgroundColor: themeColors.brandBlue },
                    {
                      left: sliderThumbAnim.interpolate({
                        inputRange: [0, 1000],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />

                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={1000}
                  step={50}
                  value={usageThreshold}
                  onValueChange={(value) => {
                    sliderThumbAnim.setValue(value);
                    if (sliderRafRef.current != null) cancelAnimationFrame(sliderRafRef.current);
                    sliderRafRef.current = requestAnimationFrame(() => {
                      setUsageThreshold(value);
                      sliderRafRef.current = null;
                    });
                  }}
                  minimumTrackTintColor="transparent"
                  maximumTrackTintColor="transparent"
                  thumbTintColor="transparent"
                />
              </View>
              <Text style={styles.thresholdValue}>
                <Text style={[styles.thresholdValueNumber, { fontSize: scaled.modalTitleBig }, isDark && { color: themeColors.brandBlue }]}>{Math.round(usageThreshold)}</Text>
                <Text style={[styles.thresholdValueUnit, { fontSize: scaled.modalTitleMid }, isDark && { color: themeColors.brandBlue }]}> kWh</Text>
              </Text>
            </View> */}

            {/* Toggle Settings */}
            <View style={styles.toggleSection}>
              {/* Bill Due Reminders */}
              <View style={[styles.toggleRow, isDark && { backgroundColor: themeColors.inputBg }]}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleTitle, { fontSize: scaled.toggleTitle }, isDark && { color: themeColors.textPrimary }]}>Bill Due Reminders</Text>
                  <Text style={[styles.toggleSubtitle, { fontSize: scaled.toggleSub }, isDark && { color: themeColors.textSecondary }]}>3 days before due date</Text>
                </View>
                <Switch
                  value={billDueReminders}
                  onValueChange={setBillDueReminders}
                  trackColor={{ false: isDark ? "#4A4A4A" : "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor={isDark ? "#4A4A4A" : "#D1D5DB"}
                />
              </View>

              {/* Payment Confirmations */}
              <View style={[styles.toggleRow, isDark && { backgroundColor: themeColors.inputBg }]}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleTitle, { fontSize: scaled.toggleTitle }, isDark && { color: themeColors.textPrimary }]}>Payment Confirmations</Text>
                  <Text style={[styles.toggleSubtitle, { fontSize: scaled.toggleSub }, isDark && { color: themeColors.textSecondary }]}>Instant notification</Text>
                </View>
                <Switch
                  value={paymentConfirmations}
                  onValueChange={setPaymentConfirmations}
                  trackColor={{ false: isDark ? "#4A4A4A" : "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor={isDark ? "#4A4A4A" : "#D1D5DB"}
                />
              </View>

              {/* Bill Amount Alerts - commented out
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleTitle, { fontSize: scaled.toggleTitle }]}>Bill Amount Alerts</Text>
                  <Text style={[styles.toggleSubtitle, { fontSize: scaled.toggleSub }]}>When bill exceeds ₹5000</Text>
                </View>
                <Switch
                  value={billAmountAlerts}
                  onValueChange={setBillAmountAlerts}
                  trackColor={{ false: "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
              */}

              {/* Tamper Alerts */}
              <View style={[styles.toggleRow, isDark && { backgroundColor: themeColors.inputBg }]}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleTitle, { fontSize: scaled.toggleTitle }, isDark && { color: themeColors.textPrimary }]}>Tamper Alerts</Text>
                  <Text style={[styles.toggleSubtitle, { fontSize: scaled.toggleSub }, isDark && { color: themeColors.textSecondary }]}>Immediate notification</Text>
                </View>
                <Switch
                  value={tamperAlerts}
                  onValueChange={setTamperAlerts}
                  trackColor={{ false: isDark ? "#4A4A4A" : "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor={isDark ? "#4A4A4A" : "#D1D5DB"}
                />
              </View>

              {/* Email Notifications */}
              <View style={[styles.toggleRow, isDark && { backgroundColor: themeColors.inputBg }]}>
                <View style={styles.toggleInfo}>
                  <Text style={[styles.toggleTitle, { fontSize: scaled.toggleTitle }, isDark && { color: themeColors.textPrimary }]}>Email Notifications</Text>
                  <Text style={[styles.toggleSubtitle, { fontSize: scaled.toggleSub }, isDark && { color: themeColors.textSecondary }]}>Receive updates via email</Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{ false: isDark ? "#4A4A4A" : "#D1D5DB", true: COLORS.secondaryColor }}
                  thumbColor={"#FFFFFF"}
                  ios_backgroundColor={isDark ? "#4A4A4A" : "#D1D5DB"}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
              onPress={handleSaveAlertSettings}
            >
              <Text style={[styles.saveButtonText, { fontSize: scaled.modalButton }]}>Save Settings</Text>
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
          <View style={styles.logoutModalIconWrap}>
            <View style={styles.logoutModalIconWrap2}>
              <LogoutButton width={28} height={28} color="#FADCDC" />
            </View>
            </View>
            <Text style={[styles.logoutModalTitle, { fontSize: scaled.logoutModalTitle }]}>Logout</Text>
            <Text style={[styles.logoutModalMessage, { fontSize: scaled.modalMessage }]}>
              Are you sure you want to logout from your account?
            </Text>

            <View style={styles.logoutModalButtonsRow}>
              <TouchableOpacity
                style={styles.logoutModalCancelButton}
                activeOpacity={0.8}
                onPress={handleCancelLogout}
              >
                <Text style={[styles.logoutModalCancelText, { fontSize: scaled.modalButton }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutModalConfirmButton}
                activeOpacity={0.8}
                onPress={handleConfirmLogout}
              >
                <Text style={[styles.logoutModalConfirmText, { fontSize: scaled.modalButton }]}>Logout</Text>
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
    paddingBottom: 50,
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
  alertsModalOverlayDark: {
    backgroundColor: "rgba(0,0,0,0.7)",
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
    fontSize: 16,
    fontFamily: "Manrope-Medium",
    color: "#6B7280",
    marginBottom: 12,
  },
  sliderContainer: {
    marginHorizontal: 0,
    height: 24,
    justifyContent: "center",
    position: "relative",
  },
  sliderTrackBg: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
  },
  sliderTrackFilled: {
    position: "absolute",
    left: 0,
    top: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#163B7C",
  },
  sliderThumb: {
    position: "absolute",
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: "#163B7C",
    top: 4.5,
    marginLeft: -7.5,
    zIndex: 2,
  },
  slider: {
    width: "100%",
    height: 24,
    paddingVertical: 0,
    marginVertical: 0,
  },
  thresholdValue: {
    marginTop: 8,
    textAlign: "center",
  },
  thresholdValueNumber: {
    fontSize: 26,
    fontFamily: "Manrope-Bold",
    color: "#163B7C",
  },
  thresholdValueUnit: {
    fontSize: 18,
    fontFamily: "Manrope-Bold",
    color: "#163B7C",
  },
  toggleSection: {
    // marginTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 5,
    marginBottom: 10,
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
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  // Logout Modal Styles — exact match to design
  logoutModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutModalCard: {
    width: "86%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: "center",
    shadowColor: "#1A202C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
    gap: 10,
  },
  logoutModalIconWrap2: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE4E2",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutModalIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: "#FEF3F2",
    justifyContent: "center",
    alignItems: "center",
  },
  logoutModalTitle: {
    fontFamily: "Manrope-Bold",
    color: "#163B7C",
    textAlign: "center",
    fontSize: 24,
  },
  logoutModalMessage: {
    fontFamily: "Manrope-Regular",
    color: "#4A5568",
    textAlign: "center",
    lineHeight: 22,
    fontSize:18,
  },
  logoutModalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    gap: 20,
  },
  logoutModalCancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logoutModalCancelText: {
    fontFamily: "Manrope-Medium",
    color: "#4A5568",
  },
  logoutModalConfirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E53E3E",
  },
  logoutModalConfirmText: {
    fontFamily: "Manrope-Medium",
    color: "#FFFFFF",
  },
});
