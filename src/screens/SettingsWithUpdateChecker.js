import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import React from "react";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import Menu from "../../assets/icons/bars.svg";
import MenuWhite from "../../assets/icons/menuBarWhite.svg";
import Notification from "../../assets/icons/notification.svg";
import NotificationWhite from "../../assets/icons/NotificationWhite.svg";
import BiLogo from "../../assets/icons/Logo.svg";
import UpdateChecker from "../components/global/UpdateChecker";

const SettingsWithUpdateChecker = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  return (
    <ScrollView
      style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.bluecontainer, isDark && { backgroundColor: themeColors.screen }]}>
        <View style={styles.TopMenu}>
          <Pressable
            style={[styles.barsIcon, isDark && { backgroundColor: '#1A1F2E' }]}
            onPress={() => navigation.navigate("SideMenu")}
          >
            {isDark ? (
              <MenuWhite width={18} height={18} />
            ) : (
              <Menu width={18} height={18} fill="#202d59" />
            )}
          </Pressable>
          <Pressable onPress={() => navigation.navigate("PostPaidDashboard")}>
            <BiLogo width={45} height={45} />
          </Pressable>
          <Pressable
            style={[styles.bellIcon, isDark && { backgroundColor: '#1A1F2E' }]}
            onPress={() => navigation.navigate("Profile")}
          >
            {isDark ? (
              <NotificationWhite width={18} height={18} />
            ) : (
              <Notification width={18} height={18} fill="#202d59" />
            )}
          </Pressable>
        </View>
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.usageText}>Welcome to Settings page</Text>
      </View>

      {/* Update Checker Component */}
      <UpdateChecker style={styles.updateChecker} />
    </ScrollView>
  );
};

export default SettingsWithUpdateChecker;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  TopMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barsIcon: {
    padding: 8,
  },
  bellIcon: {
    padding: 8,
  },
  textContainer: {
    padding: 20,
    alignItems: "center",
  },
  usageText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primaryFontColor,
    textAlign: "center",
  },
  updateChecker: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
