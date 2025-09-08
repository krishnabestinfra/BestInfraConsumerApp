import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notificationsWhite.svg";
import BiLogo from "../../assets/icons/LogoWhite.svg";
import HandBill from "../../assets/icons/handBill.svg";
import Calendar from "../../assets/icons/calendar.svg";
import CheapDollar from "../../assets/icons/cheapDollar.svg";
import NotificationCard from "../components/global/NotificationCard";
import Logo from "../components/global/Logo";
import { COLORS } from "../constants/colors";

const Profile = ({ navigation }) => {
  const handleNotificationPress = (type) => {
    // Handle notification press
  };

  return (
    <View style={styles.Container}>
      <StatusBar style="light" />
      <View style={styles.TopMenu}>
        <Pressable
          style={styles.barsIcon}
          onPress={() => navigation.navigate("SideMenu")}
        >
          <Menu width={18} height={18} fill="#202d59" />
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Dashboard")}>
          {/* <Image icon={BiLogo} size={45} /> */}
          <Logo variant="white" size="medium" />
        </Pressable>
        <View style={styles.bellIcon}>
          <Notification width={18} height={18} fill="#ffffff" />
        </View>
      </View>
      
      <View style={styles.notificationsContainer}>
        <NotificationCard
          title="Low Balance Alert"
          description="Your meter balance is below ₹100."
          subDescription="Recharge now to avoid disconnection."
          icon={CheapDollar}
          variant="info"
          onPress={() => handleNotificationPress('balance')}
        />
        
        <NotificationCard
          title="Upcoming Due Date"
          description="Your bill of ₹3,180 is due on 10 May."
          subDescription="Pay now to avoid late fees."
          icon={Calendar}
          variant="warning"
          onPress={() => handleNotificationPress('due')}
        />
        
        <NotificationCard
          title="Payment Successful"
          description="₹3,180 received."
          subDescription="Thank you for staying current."
          icon={HandBill}
          variant="success"
          onPress={() => handleNotificationPress('payment')}
        />
      </View>
    </View>
  );
};

export default Profile;

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
    paddingBottom: 15,
    paddingHorizontal: 30,
  },
  barsIcon: {
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
  logo: {
    width: 80,
    height: 80,
    zIndex: 1,
  },
  bellIcon: {
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
  notificationsContainer: {
    padding: 20,
    paddingTop: 10,
  },
});
