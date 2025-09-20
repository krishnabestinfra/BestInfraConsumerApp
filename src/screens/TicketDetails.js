import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { COLORS } from "../constants/colors";
import React, { useEffect, useRef, useState } from "react";
import GlobeShield from "../../assets/icons/globe-shield.svg";
import RechargeIcon from "../../assets/icons/recharge.svg";
import InvoicesIcon from "../../assets/icons/invoices.svg";
import TicketsIcon from "../../assets/icons/tickets.svg";
import UsageIcon from "../../assets/icons/usage.svg";
import Hand from "../../assets/icons/hand.svg";
import Arrow from "../../assets/icons/arrow.svg";
import Plus from "../../assets/icons/plus.svg";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Easing } from "react-native-reanimated";
import { getUser } from "../utils/storage";
import Logo from "../components/global/Logo";
import TicketChatBox from "../components/TicketChatBox";
import DropdownIcon from "../../assets/icons/dropDown.svg";

const { width, height } = Dimensions.get("window");

const RING_COUNT = 20;
const RING_DELAY = 800;
const ANIMATION_DURATION = 5000;

const Ring = ({ index, progress }) => {
  const ringStyle = useAnimatedStyle(() => {
    const delay = index * RING_DELAY;
    const localProgress =
      Math.max(0, progress.value - delay) / ANIMATION_DURATION;
    const clamped = Math.min(localProgress, 1);

    return {
      opacity: interpolate(clamped, [0, 0.1, 1], [0, 0.6, 0]),

      transform: [
        {
          scale: interpolate(clamped, [0, 1], [0.4, 4]),
        },
      ],
    };
  });

  return <Animated.View style={[styles.ring, ringStyle]} />;
};

const TicketDetails = ({ navigation }) => {
  const progress = useSharedValue(0);
  const [userName, setUserName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);


  const loopAnimation = () => {
    progress.value = 0;
    progress.value = withTiming(
      RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION,
      {
        duration: RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION,
        easing: Easing.inOut(Easing.ease), // Smooth easing
      },
      () => runOnJS(loopAnimation)()
    );
  };

  useEffect(() => {
    loopAnimation();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      if (user) {
        setUserName(user.name);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    (async () => {
      const user = await getUser();
    })();
  }, []);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={[styles.bluecontainer, { flex: 1 }]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.TopMenu}>
          <Pressable
            style={styles.barsIcon}
            onPress={() => navigation.navigate("SideMenu")}
          >
            <Menu width={18} height={18} fill="#202d59" />
          </Pressable>
          <View style={styles.logoWrapper}>
            {Array.from({ length: RING_COUNT }).map((_, index) => (
              <Ring key={index} index={index} progress={progress} />
            ))}
            <Logo variant="blue" size="medium" />
          </View>
          <Pressable
            style={styles.bellIcon}
            onPress={() => navigation.navigate("Profile")}
          >
            <Notification width={18} height={18} fill="#202d59" />
          </Pressable>
        </View>

        <View style={styles.TicketDetailsContainer}>
          <TouchableOpacity 
              style={styles.TicketDetailsHeader} 
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.TicketDetailsText}>Ticket Details</Text>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.HighTextBox}>
                  <Text style={styles.HighText}>High</Text>
                </View>
                  <DropdownIcon
                    width={14}
                    height={14}
                    style={{
                      marginLeft: 8,
                      transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
                    }}
                  />
              </View>
            </TouchableOpacity>
              {isExpanded && (

          <View style={styles.TicketDetailsMainContainer}>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Ticket ID</Text>
              <Text style={styles.TicketDetailsMainTextValue}>#298</Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Ticket Type</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                Connection Issue
              </Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Created On</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                17/08/2025, 04:04 PM
              </Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Last Updated On</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                17/08/2025, 04:04 PM
              </Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Assigned To</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                BI - Tech Team
              </Text>
            </View>
          </View>
           )}
        </View>
        <View style={styles.TicketChatContainer}>
          <TicketChatBox />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default TicketDetails;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
    flex: 1, // Apply flex: 1 to bluecontainer
    flexDirection: "column", // Add flexDirection to stack children vertically
  },
  TopMenu: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    verticalAlign: "middle",
    justifyContent: "center",
    elevation: 5,
    zIndex: 2,
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
    elevation: 5,
    zIndex: 2,
  },
  ProfileBox: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row",
    marginHorizontal: 4,
  },
  textContainer: {
    paddingHorizontal: 20,
  },
  usageText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Medium",
    fontSize: 16,
    textAlign: "center",
    paddingTop: 0,
    marginTop: 30,
  },
  hiText: {
    color: COLORS.primaryFontColor,
    fontSize: 18,
    fontFamily: "Manrope-Bold",
  },
  stayingText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  balanceText: {
    color: COLORS.primaryFontColor,
    marginLeft: 20,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  amountText: {
    color: COLORS.primaryColor,
    fontSize: 20,
    fontFamily: "Manrope-Bold",
  },

  plusBox: {
    marginLeft: 7,
  },
  amountContainer: {
    backgroundColor: COLORS.primaryColor,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderRadius: 8,
    alignItems: "center",
    paddingHorizontal: 15,
  },
  dueText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Medium",
  },
  dateText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  greenBox: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 8,
    justifyContent: "space-between",
    paddingHorizontal: 10,
    alignItems: "center",
    padding: 10,
    marginTop: 3,
  },
  payText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
  },
  tostayText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
  },
  avoidText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  paynowbox: {
    backgroundColor: COLORS.secondaryFontColor,
    height: 35,
    width: 95,
    borderRadius: 5,
    display: "flex",
    justifyContent: "center",
  },
  paynowText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    textAlign: "center",
    verticalAlign: "middle",
  },
  iconsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: 15,
  },
  individualBox: {
    alignItems: "center",
    width: 85,
  },
  iconBox: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
    marginTop: 5,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ring: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "#BABECC66",
    opacity: 0.2,
  },

  TicketDetailsContainer: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 5,
    // flex: 1, 
    marginBottom: 5, // Add some margin bottom to separate from chat container
  },
  TicketDetailsHeader: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F8F8F8",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  TicketDetailsText: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Bold",
    fontSize: 14,
  },
  HighTextBox: {
    backgroundColor: "#FF9C9C",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  HighText: {
    fontFamily: "Manrope-SemiBold",
    fontSize: 8,
    color: "#fff",
  },
  TicketDetailsMainText: {
    fontFamily: "Manrope-Bold",
    fontSize: 12,
    color: "#000",
  },
  TicketDetailsMainTextValue: {
    fontFamily: "Manrope-Regular",
    fontSize: 10,
    color: "#000",
  },
  TicketDetailsMainContainer: {
    padding: 20,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  TicketDetailsMainItem: {
    width: "45%",
  },
  TicketChatContainer: {
    marginTop: 10,
    // height: "100%",
    flex: 1, // Make TicketChatContainer take available height
  },
});
