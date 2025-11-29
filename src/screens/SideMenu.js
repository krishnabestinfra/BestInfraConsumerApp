import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import React, { useState, useCallback } from "react";
import { COLORS } from "../constants/colors";
import Menu from "../../assets/icons/barsWhite.svg";
import Notification from "../../assets/icons/notification.svg";
import BiLogo from "../../assets/icons/LogoWhite.svg";
import Dashboard from "./Dashboard";
import Usage from "./Usage";
import PostPaidRechargePayments from "./PostPaidRechargePayments";
import Transactions from "./Transactions";
import Tickets from "./Tickets";
import Settings from "./Settings";
import { BlurView } from "expo-blur";
import { useContext } from "react";
import { TabContext } from "../context/TabContext"; 
import SideMenuNavigation from "../components/SideMenuNavigation";
import Logo from "../components/global/Logo";
import { logoutUser } from "../utils/storage";
import CrossIcon from "../../assets/icons/crossWhite.svg";

const SideMenu = ({ navigation }) => {
  const { activeItem, setActiveItem } = useContext(TabContext);

  const handleMenuPress = (item) => {
    setActiveItem(item); 
    navigation.navigate(item);
  };

  const handleLogout = async () => {
    try {
      console.log('🔄 User initiated logout...');
      // Call logout which handles server token revocation and local cleanup
      await logoutUser(); // This calls authService.logout() which revokes tokens on server
      setActiveItem("Logout");
      
      // Navigate to Login screen after logout
      // Use reset to clear navigation stack
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
      console.log('✅ Logout complete - navigated to Login');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Still navigate to login even if logout had errors
      navigation.reset({
        index: 0,
        routes: [{ name: "Login" }],
      });
    }
  };

  const renderContent = () => {
    switch (activeItem) {
      case "Dashboard":
        return <Dashboard />;
      case "Usage":
        return <Usage />;
      case "PostPaidRechargePayments":
        return <PostPaidRechargePayments />;
      case "Transactions":
        return <Transactions />;
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
        <Pressable style={styles.barsIcon} onPress={() => navigation.navigate("PostPaidDashboard")}>
          <Menu width={18} height={18} fill="#ffffff"/>
          {/* <CrossIcon width={30} height={30} fill="#ffffff"/> */}
        </Pressable>
        <Pressable
         onPress={() => {
          setActiveItem("PostPaidDashboard");  
          navigation.navigate("PostPaidDashboard");
         }}>
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
          <ScrollView scrollEnabled={false} style={styles.DashComponentsbar}>
            <View>
              <Pressable
                onPress={() => {
                  navigation.navigate(activeItem);
                }}
              >
                {renderContent()}
              </Pressable>
            </View>
          </ScrollView>
          <ScrollView scrollEnabled={false} style={styles.LoginComponentsbar}>
            <BlurView tint="dark" style={styles.blurContainer}>
              <View>{renderContent()}</View>
            </BlurView>
          </ScrollView>
        </View>
      </View>
    </View>
  );
};


export default SideMenu;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.brandBlueColor,
    height: "100%",
  },
  TopMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 35,
    paddingHorizontal: 30,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryColor,
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
    justifyContent: "center",
  },
  MenuContainer: {
    flexDirection: "row",
  },
  menubar: {
    paddingLeft: 30,
    paddingTop: 30,
    justifyContent: "space-between",
    height:"87%"
  },
  componentsbar: {
    position: "relative",
    height: "77%",
  },
  DashComponentsbar: {
    top:10,
    height: "50%",
    backgroundColor: "#eef8f0",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    zIndex: 999,
    marginLeft: 60,
    elevation: 10,
  },
  LoginComponentsbar: {
    position: "absolute",
    height: "85%",
    left: 25,
    top: 80,
    backgroundColor: "#eef8f0",
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 20,
    elevation: 10,
    opacity: 0.3,
  },
  Bottommenubar: {
    paddingBottom: 30,
  },
  blurContainer: {
    flex: 1,
    width: "100%",
  },
});
