import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import React, { useState, useCallback } from "react";
import { COLORS } from "../constants/colors";
import Menu from "../../assets/icons/barsWhite.svg";
import Notification from "../../assets/icons/notification.svg";
import BiLogo from "../../assets/icons/LogoWhite.svg";
import Dashboard from "./Dashboard";
import Usage from "./Usage";
import Payments from "./Payments";
import Transactions from "./Transactions";
import Tickets from "./Tickets";
import Settings from "./Settings";
import { BlurView } from "expo-blur";
import { useContext } from "react";
import { TabContext } from "../context/TabContext"; 
import SideMenuNavigation from "../components/SideMenuNavigation";
import Logo from "../components/global/Logo";

const SideMenu = ({ navigation }) => {
  const { activeItem, setActiveItem } = useContext(TabContext);

  const handleMenuPress = (item) => {
    setActiveItem(item); 
    navigation.navigate(item);
  };

  const handleLogout = () => {
    setActiveItem("Logout");
    navigation.replace("Login"); 
  };

  const renderContent = () => {
    switch (activeItem) {
      case "Dashboard":
        return <Dashboard />;
      case "Usage":
        return <Usage />;
      case "Payments":
        return <Payments />;
      case "Transactions":
        return <Transactions />;
      case "Tickets":
        return <Tickets />;
      case "Settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };
  return (
    <View style={styles.Container}>
      <StatusBar style="light"/>
      <View style={styles.TopMenu}>
        <View style={styles.barsIcon}>
          <Menu width={18} height={18} fill="#ffffff" />
        </View>
        <Pressable onPress={() => navigation.navigate("Dashboard")}>
          {/* <BiLogo width={45} height={45} /> */}
          <Logo variant="white" size="medium" />
        </Pressable>
        <Pressable style={styles.bellIcon} onPress={() => navigation.navigate("Profile")}>
          <Notification width={18} height={18} fill="#000" />
        </Pressable>
      </View>

      <View style={styles.MenuContainer}>
        <View style={styles.menubar}>
          <SideMenuNavigation navigation={navigation} activeItem={activeItem} handleMenuPress={handleMenuPress}/>
        </View>
        <View style={styles.componentsbar}>
          <View style={styles.DashComponentsbar}>
            <ScrollView scrollEnabled={false}>
              <Pressable
                onPress={() => {
                  navigation.navigate(activeItem);
                }}
              >
                {renderContent()}
              </Pressable>
            </ScrollView>
          </View>
          <View style={styles.LoginComponentsbar}>
            <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
              <ScrollView scrollEnabled={false}>{renderContent()}</ScrollView>
            </BlurView>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SideMenu;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.primaryColor,
    height: "100%",
  },
  TopMenu: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 45,
    paddingHorizontal: 30,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    verticalAlign: "middle",
    justifyContent: "center",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android shadow
    elevation: 5,
  },
  logoImage: {},
  logo: {
    width: 80,
    height: 80,
    zIndex: 1,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    verticalAlign: "middle",
    justifyContent: "center",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android shadow
    elevation: 5,
  },
  MenuContainer: {
    flexDirection: "row",
  },
  menubar: {
    width: "50%",
    paddingLeft: 30,
    paddingTop: 30,
    display: "flex",
    justifyContent: "space-between",
  },
  componentsbar: {
    position: "relative",
    height: "100%",
  },
  DashComponentsbar: {
    height: 670,
    backgroundColor: "#eef8f0",
    borderTopLeftRadius: 30,
    zIndex: 999,
    marginLeft: 60,
    elevation: 10,
  },
  LoginComponentsbar: {
    position: "absolute",
    height: 620,
    left: 25,
    top: 50,
    backgroundColor: "#eef8f0",
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 0,
    elevation: 10,
    opacity: 0.3,
  },
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
