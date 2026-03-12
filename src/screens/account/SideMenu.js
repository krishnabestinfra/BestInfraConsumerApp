import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
  StatusBar,
} from "react-native";
import React, { useState, useCallback, useEffect, useContext, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import Menu from "../../../assets/icons/barsWhite.svg";
import Notification from "../../../assets/icons/notification.svg";
import NotificationWhite from "../../../assets/icons/NotificationWhite.svg";
import Usage from "../usage/Usage";
import PostPaidRechargePayments from "../recharge/PostPaidRechargePayments";
import PrePaidRechargePayments from "../recharge/PrePaidRechargePayments";
import Transactions from "../invoices/Transactions";
import Settings from "./Settings";
import { BlurView } from "expo-blur";
import { TabContext } from "../../context/TabContext";
import { useNotifications } from "../../context/NotificationsContext";
import SideMenuNavigation from "../../components/SideMenuNavigation";
import Logo from "../../components/global/Logo";
import { logoutUser, getUser } from "../../utils/storage";
import { apiClient } from "../../services/apiClient";
import { API_ENDPOINTS } from "../../constants/constants";
import { useConsumer } from "../../context/ConsumerContext";
import { getTenantSubdomain } from "../../config/apiConfig";
import Dashboard from "../dashboard/Dashboard";

/* ---------------- Skeleton ---------------- */

const SkeletonField = ({ width = "70%", height = 14, style }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "rgba(255,255,255,0.35)",
          borderRadius: 4,
          opacity,
        },
        style,
      ]}
    />
  );
};

/* ---------------- Component ---------------- */

const SideMenu = ({ navigation }) => {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const { unreadCount } = useNotifications();
  const { clearConsumer } = useConsumer();
  const { activeItem, setActiveItem } = useContext(TabContext);

  const s14 = getScaledFontSize(14);
  const s11 = getScaledFontSize(11);

  const [profileData, setProfileData] = useState({ name: "", consumerId: "" });
  const [isUserLoading, setIsUserLoading] = useState(true);
  const lastFetchedAtRef = useRef(0);

  const tenantSubdomain = getTenantSubdomain ? getTenantSubdomain() : "gmr";
  const tenantLogoSource =
    tenantSubdomain === "ntpl"
      ? require("../../../assets/images/ntpl.png")
      : tenantSubdomain === "demo"
        ? require("../../../assets/clients/tgnpdcl_logo.png")
        : require("../../../assets/images/gmr.png");

  /* ---------------- Profile Fetch ---------------- */

  useFocusEffect(
    useCallback(() => {
      if (Date.now() - lastFetchedAtRef.current < 120000) return;

      let isMounted = true;

      const fetchProfile = async () => {
        try {
          setIsUserLoading(true);

          const user = await getUser();

          if (!user?.identifier) {
            if (isMounted) setProfileData({ name: "-", consumerId: "-" });
            return;
          }

          const endpoint = API_ENDPOINTS.consumers.get(user.identifier);
          const result = await apiClient.request(endpoint, { method: "GET" });

          let name = user.name || "";
          let consumerId = user.identifier;

          if (result.success && result.data) {
            const cd = result.data;
            name = cd.name || cd.consumerName || name;
            consumerId =
              cd.uniqueIdentificationNo ||
              user.identifier ||
              user.consumerNumber;
          }

          if (!name) name = "Consumer";

          if (isMounted) {
            setProfileData({
              name,
              consumerId: consumerId || "-",
            });
          }
        } catch {
          if (isMounted) {
            setProfileData({
              name: "Consumer",
              consumerId: "-",
            });
          }
        } finally {
          if (isMounted) setIsUserLoading(false);
          lastFetchedAtRef.current = Date.now();
        }
      };

      fetchProfile();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  /* ---------------- Navigation ---------------- */

  const handleMenuPress = (item) => {
    setActiveItem(item);
    navigation.navigate(item);
  };

  const handleLogout = async () => {
    await logoutUser();
    clearConsumer();
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  const renderContent = () => {
    switch (activeItem) {
      case "Dashboard":
        return <Dashboard />;
      case "Usage":
        return <Usage />;
      case "PostPaidRechargePayments":
        return <PostPaidRechargePayments />;
      case "PrePaidRechargePayments":
        return <PrePaidRechargePayments />;
      case "Transactions":
        return <Transactions />;
      case "Settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <View style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}>

      <StatusBar
        barStyle="light-content"
      />

      <View style={styles.TopMenu}>
        <Pressable
          style={[styles.barsIcon, isDark && { backgroundColor: '#1A1F2E' }]}
          onPress={() => navigation.navigate("Dashboard")}
        >
          <Menu width={18} height={18} fill="#ffffff" />
        </Pressable>

        <Pressable
          onPress={() => {
            setActiveItem("Dashboard");
            navigation.navigate("Dashboard");
          }}
        >
          <Logo variant="white" size="medium" />
        </Pressable>

        <Pressable
          style={styles.bellWrapper}
          onPress={() => navigation.navigate("Notifications")}
        >
          <View style={[styles.bellIcon, isDark && { backgroundColor: '#1A1F2E' }]}>
            {isDark ? (
              <NotificationWhite width={18} height={18} />
            ) : (
              <Notification width={18} height={18} fill={COLORS.brandBlueColor} />
            )}
          </View>

          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Profile Section */}
      <Pressable
        style={styles.profileSection}
        onPress={() => navigation.navigate("Profile")}
      >
        <View style={[styles.profileContainer, isDark && { backgroundColor: '#1A1F2E' }]}>
          <View style={styles.profileImageWrapper}>
            <Image
              source={require("../../../assets/images/profileBlank.png")}
              style={styles.gmrLogo}
            />
            <Image source={tenantLogoSource} style={styles.profileImage} />
          </View>

          <View style={styles.profileInfo}>
            {isUserLoading ? (
              <>
                <SkeletonField width="70%" height={s14} style={{ marginBottom: 6 }} />
                <SkeletonField width="50%" height={s11} />
              </>
            ) : (
              <>
                <Text style={[styles.profileName, { fontSize: s14 }]}>
                  {profileData.name}
                </Text>
                <Text style={[styles.profileId, { fontSize: s11 }]}>
                  ID: {profileData.consumerId}
                </Text>
              </>
            )}
          </View>
        </View>
      </Pressable>

      <View style={styles.MenuContainer}>
        <View style={styles.menubar}>
          <SideMenuNavigation
            navigation={navigation}
            activeItem={activeItem}
            handleMenuPress={handleMenuPress}
          />
        </View>

        <View style={styles.componentsbar}>
          <ScrollView scrollEnabled={false} style={styles.DashComponentsbar}>
            <View>{renderContent()}</View>
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

/* ---------------- Styles (UNCHANGED) ---------------- */

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
    paddingBottom: 20,
    paddingHorizontal: 30,
  },
  profileSection: {
    paddingHorizontal: 30,
    marginBottom: 10,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    paddingRight: 16,
  },
  profileImageWrapper: {
    position: "relative",
    marginRight: 15,
  },
  gmrLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: "#fff",
    backgroundColor: "#FFFFFF",
  },
  profileImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    bottom: 12,
    right: -4,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontFamily: "Manrope-Bold",
    color: COLORS.secondaryFontColor,
  },
  profileId: {
    fontFamily: "Manrope-Regular",
    color: "#B0BDD2",
    marginTop: 1,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  bellWrapper: {
    position: "relative",
    overflow: "visible",
  },
  badge: {
    position: "absolute",
    right: -3,
    top: -3,
    backgroundColor: "red",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#fff",
    zIndex: 10,
    elevation: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Manrope-Regular",
  },
  MenuContainer: {
    flexDirection: "row",
  },
  menubar: {
    paddingLeft: 30,
    paddingTop: 30,
    justifyContent: "space-between",
    height: "87%",
  },
  componentsbar: {
    position: "relative",
    height: "77%",
  },
  DashComponentsbar: {
    top: 10,
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
    top: 60,
    backgroundColor: "#eef8f0",
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
    elevation: 10,
    opacity: 0.3,
  },
  blurContainer: {
    flex: 1,
    width: "100%",
  },
});