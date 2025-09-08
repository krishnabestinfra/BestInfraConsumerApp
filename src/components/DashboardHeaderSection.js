import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { COLORS } from "../constants/colors";
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
import BiLogo from "../../assets/icons/Logo.svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Easing } from "react-native-reanimated";
import { getUser } from "../utils/storage";
import Logo from "./global/Logo";

const { width, height } = Dimensions.get("window");

const RING_COUNT = 100;
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

const DashboardHeaderSection = ({ navigation }) => {
  const progress = useSharedValue(0);
  const [userName, setUserName] = useState("");

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
    console.log("🟡 Logged in user from storage:", user);
  })();
}, []);

  return (
    <>
      <View style={styles.bluecontainer}>
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
            {/* <BiLogo width={45} height={45} /> */}
            <Logo variant="blue" size="medium" />
          </View>
          <Pressable
            style={styles.bellIcon}
            onPress={() => navigation.navigate("Profile")}
          >
            {/* <Notification width={18} height={18} fill="#202d59" /> */}
            <Notification width={18} height={18} fill="#202d59" />
          </Pressable>
        </View>
        <View style={styles.ProfileBox}>
          <View>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={styles.hiText}>Hi, {userName} </Text>
              <Hand width={30} height={30} fill="#55B56C" />
            </View>
            <Text style={styles.stayingText}>Staying efficient today?</Text>
          </View>
          <View>
            <Text style={styles.balanceText}>Balance</Text>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 5,
                justifyContent: "center",
              }}
            >
              <Text style={styles.amountText}>₹1,245</Text>
              <View style={styles.plusBox}>
                <Plus width={20} height={20} fill="#55B56C" />
              </View>
            </View>
          </View>
        </View>
        <View style={{ marginTop: 20 }}>
          <View style={styles.amountContainer}>
            <Text style={styles.dueText}>Due Amount: ₹3,180</Text>
            <Text style={styles.dateText}>10/05/2025</Text>
          </View>
          <View style={styles.greenBox}>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
              }}
            >
              <GlobeShield
                width={25}
                height={25}
                fill="#55b56c"
                style={{ marginHorizontal: 12, marginTop: 6 }}
              />
              <View>
                <Text style={styles.payText}>Pay securely</Text>
                <Text style={styles.tostayText}>to stay on track.</Text>
                <Text style={styles.avoidText}>Avoid service disruption.</Text>
              </View>
            </View>
            <View style={styles.paynowbox}>
              <Text style={styles.paynowText}>Pay Now</Text>
            </View>
          </View>
        </View>
        <View style={styles.iconsContainer}>
          <View style={styles.individualBox}>
            <View style={styles.iconBox}>
              <RechargeIcon width={18} height={18} fill="#55B56C" />
            </View>
            <Text style={styles.iconText}>Recharge</Text>
          </View>
          <View style={styles.individualBox}>
            <View style={styles.iconBox}>
              <InvoicesIcon width={20} height={20} fill="#55B56C" />
            </View>
            <Text style={styles.iconText}>Invoices</Text>
          </View>
          <View style={styles.individualBox}>
            <View style={styles.iconBox}>
              <TicketsIcon width={20} height={20} fill="#55B56C" />
            </View>
            <Text style={styles.iconText}>Tickets</Text>
          </View>
          <View style={styles.individualBox}>
            <View style={styles.iconBox}>
              <UsageIcon width={20} height={20} fill="#55B56C" />
            </View>
            <Text style={styles.iconText}>Usage</Text>
          </View>
        </View>
      </View>
    </>
  );
};

export default DashboardHeaderSection;

const styles = StyleSheet.create({
  bluecontainer: {
    backgroundColor: "#eef8f0",
    padding: 15,
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
    elevation: 1,
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
    elevation: 1,
    zIndex: 2,
  },
  ProfileBox: {
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "row",
    marginHorizontal: 4,
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
    // borderWidth: 6,
    // borderColor: "rgba(0, 224, 159, 0.5)",
    borderColor: "#BABECC66",
    opacity: 0.2,
  },
});
