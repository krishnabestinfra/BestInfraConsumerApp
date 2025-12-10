import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import React from "react";
import { COLORS } from "../constants/colors";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import BiLogo from "../../assets/icons/Logo.svg";
import UpdateChecker from "../components/global/UpdateChecker";

const Settings = ({ navigation }) => {
  return (
    <ScrollView
      style={styles.Container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.bluecontainer}>
        <View style={styles.TopMenu}>
          <Pressable
            style={styles.barsIcon}
            onPress={() => navigation.navigate("SideMenu")}
          >
            <Menu width={18} height={18} fill="#202d59" />
          </Pressable>
          <Pressable onPress={() => navigation.navigate("PostPaidDashboard")}>
            <BiLogo width={45} height={45} />
          </Pressable>
          <Pressable
            style={styles.bellIcon}
            onPress={() => navigation.navigate("Profile")}
          >
            <Notification width={18} height={18} fill="#202d59" />
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

export default Settings;

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
