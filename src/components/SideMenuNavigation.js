import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import React, { useState, useCallback } from "react";
import { COLORS } from "../constants/colors";
import Button from "./global/Button";
import DashboardIcon from "../../assets/icons/dashboardMenu.svg";
import ActiveDashboard from "../../assets/icons/activeDashboard.svg";
import UsageIcon from "../../assets/icons/usageMenu.svg";
import ActiveUsage from "../../assets/icons/activeUsage.svg";
import PaymentsIcon from "../../assets/icons/paymentsMenu.svg";
import ActivePayments from "../../assets/icons/activePayments.svg";
import TransactionsIcon from "../../assets/icons/transactionMenu.svg";
import ActiveTransactions from "../../assets/icons/transactionsActive.svg";
import TicketsIcon from "../../assets/icons/ticketsMenu.svg";
import ActiveTickets from "../../assets/icons/activeTickets.svg";
import SettingsIcon from "../../assets/icons/settingMenu.svg";
import ActiveSettings from "../../assets/icons/activeSettings.svg";
import LogoutIcon from "../../assets/icons/logoutMenu.svg";
import ActiveLogout from "../../assets/icons/activeLogout.svg";
import { logoutUser } from "../utils/storage"; // adjust path

import { useContext } from "react";
import { TabContext } from "../context/TabContext"; 

const SideMenuNavigation = ({ navigation }) => {

  const { activeItem, setActiveItem } = useContext(TabContext);

  const handleMenuPress = (item) => {
    setActiveItem(item); 
    navigation.navigate(item);
  };

 const handleLogout = async () => {
  await logoutUser();
  navigation.reset({
    index: 0,
    routes: [{ name: "Splash" }],
  });
};

  return (
    <>
      <View style={styles.Topmenubar}>
        <Pressable
          style={styles.flex}
          // onPress={() => handleMenuPress("Dashboard")}
          onPress={() =>{
              setActiveItem("Dashboard");
              navigation.navigate("PostPaidDashboard");
            }}
        >
          {activeItem === "Dashboard" ? (
            <>
              <ActiveDashboard
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Dashboard" && styles.activeIcon,
                ]}
              />
            </>
          ) : (
            <>
              <DashboardIcon
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Dashboard" && styles.activeIcon,
                ]}
              />
            </>
          )}
          <Text
            style={[
              styles.menuText,
              activeItem === "Dashboard" && styles.activeText,
            ]}
          >
            Dashboard
          </Text>
        </Pressable>
        {/* <Pressable style={styles.flex} onPress={() => handleMenuPress("Usage")}>
          {activeItem === "Usage" ? (
            <>
              <ActiveUsage
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Usage" && styles.activeIcon,
                ]}
              />
            </>
          ) : (
            <>
              <UsageIcon
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Usage" && styles.activeIcon,
                ]}
              />
            </>
          )}
          <Text
            style={[
              styles.menuText,
              activeItem === "Usage" && styles.activeText,
            ]}
          >
            Usage
          </Text>
        </Pressable> */}
        <Pressable
          style={styles.flex}
          onPress={() => handleMenuPress("PostPaidRechargePayments")}
        >
          {activeItem === "PostPaidRechargePayments" ? (
            <>
              <ActivePayments
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "PostPaidRechargePayments" && styles.activeIcon,
                ]}
              />
            </>
          ) : (
            <>
              <PaymentsIcon
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "PostPaidRechargePayments" && styles.activeIcon,
                ]}
              />
            </>
          )}
          <Text
            style={[
              styles.menuText,
              activeItem === "PostPaidRechargePayments" && styles.activeText,
            ]}
          >
            Payments
          </Text>
        </Pressable>
        <Pressable
          style={styles.flex}
          onPress={() => handleMenuPress("Transactions")}
        >
          {activeItem === "Transactions" ? (
            <>
              <ActiveTransactions
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Transactions" && styles.activeIcon,
                ]}
              />
            </>
          ) : (
            <>
              <TransactionsIcon
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Transactions" && styles.activeIcon,
                ]}
              />
            </>
          )}
          <Text
            style={[
              styles.menuText,
              activeItem === "Transactions" && styles.activeText,
            ]}
          >
            Transactions
          </Text>
        </Pressable>
        <Pressable
          style={styles.flex}
          onPress={() => handleMenuPress("Tickets")}
        >
          {activeItem === "Tickets" ? (
            <>
              <ActiveTickets
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Tickets" && styles.activeIcon,
                ]}
              />
            </>
          ) : (
            <>
              <TicketsIcon
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Tickets" && styles.activeIcon,
                ]}
              />
            </>
          )}
          <Text
            style={[
              styles.menuText,
              activeItem === "Tickets" && styles.activeText,
            ]}
          >
            Tickets
          </Text>
        </Pressable>
      </View>
      <View style={styles.Bottommenubar}>
        {/* <Pressable
          style={styles.flex}
          onPress={() => handleMenuPress("Settings")}
        >
          {activeItem === "Settings" ? (
            <>
              <ActiveSettings
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Settings" && styles.activeIcon,
                ]}
              />
            </>
          ) : (
            <>
              <SettingsIcon
                width={18}
                height={18}
                style={[
                  styles.iconStyle,
                  activeItem === "Settings" && styles.activeIcon,
                ]}
              />
            </>
          )}
          <Text
            style={[
              styles.menuText,
              activeItem === "Settings" && styles.activeText,
            ]}
          >
            Settings
          </Text>
        </Pressable> */}
        <Button
          title="Logout"
          variant="ghost"
          size="small"
          onPress={handleLogout}
          style={styles.logoutButton}
          textStyle={styles.logoutText}
        >
          <LogoutIcon
            width={18}
            height={18}
            style={styles.logoutIcon}
          />
        </Button>
        <View style={styles.flex}>
          <Text style={styles.versionText}>Version 1.0.26</Text>
        </View>
      </View>
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
    display: "flex",
    flexDirection: "row",
    padding: 10,
    alignItems: "center",
  },
  logoutButton: {
    flexDirection: "row",
    // padding: 10,
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
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    color: COLORS.secondaryFontColor,
  },
  menuText: {
    fontSize: 16,
    fontFamily: "Manrope-Medium",
    color: COLORS.secondaryFontColor,
    opacity: 0.7,
  },
  versionText: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    color: "#89A1F3",
  },

  iconStyle: {
    color: COLORS.secondaryFontColor,
    opacity: 0.7,
    marginRight: 20,
  },
  ActiveiconStyle: {
    marginRight: 20,
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
  iconStyle: {
    marginRight: 20,
    opacity: 0.5,
  },
  activeIcon: {
    opacity: 1,
    color: COLORS.secondaryColor,
  },
  blurContainer: {
    borderTopLeftRadius: 30,
  },
});
