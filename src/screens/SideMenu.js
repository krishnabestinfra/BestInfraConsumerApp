import { Image, Pressable, ScrollView, StatusBar, StyleSheet, Text, View, Animated } from "react-native";
import React, { useState, useCallback, useEffect, useContext, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
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
import { TabContext } from "../context/TabContext"; 
import SideMenuNavigation from "../components/SideMenuNavigation";
import Logo from "../components/global/Logo";
import { logoutUser, getUser } from "../utils/storage";
import { apiClient } from "../services/apiClient";
import { API, API_ENDPOINTS } from "../constants/constants";
import { authService } from "../services/authService";
import CrossIcon from "../../assets/icons/crossWhite.svg";
import { getTenantSubdomain } from "../config/apiConfig";

// Skeleton placeholder for loading state
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
          backgroundColor: "rgba(255, 255, 255, 0.35)",
          borderRadius: 4,
          opacity,
        },
        style,
      ]}
    />
  );
};

const SideMenu = ({ navigation }) => {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s14 = getScaledFontSize(14);
  const s11 = getScaledFontSize(11);
  const { activeItem, setActiveItem } = useContext(TabContext);
  const [profileData, setProfileData] = useState({ name: "", consumerId: "" });
  const [isUserLoading, setIsUserLoading] = useState(true);

  // Determine current tenant (client) for branding (GMR vs NTPL)
  const tenantSubdomain = getTenantSubdomain ? getTenantSubdomain() : "gmr";
  const tenantLogoSource =
    tenantSubdomain === "ntpl"
      ? require("../../assets/images/ntpl.png")
      : require("../../assets/images/gmr.png");

  // Fetch profile data from same APIs as ProfileScreenMain (consumers + auth profile)
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchProfileData = async () => {
        try {
          setIsUserLoading(true);
          const user = await getUser();
          if (!user?.identifier) {
            if (isMounted) setProfileData({ name: "-", consumerId: "-" });
            return;
          }

          // 1) Fetch consumer data - same as ProfileScreenMain
          const consumerEndpoint = API_ENDPOINTS.consumers.get(user.identifier);
          const consumerResult = await apiClient.request(consumerEndpoint, { method: "GET" });

          let name = "";
          let consumerId = user.identifier;

          if (consumerResult.success && consumerResult.data) {
            const cd = consumerResult.data;
            name = cd.name || cd.consumerName || "";
            consumerId = cd.uniqueIdentificationNo || user.identifier || user.consumerNumber;
          }

          // 2) Auth profile for name fallback if consumer API has no name (optional)
          if (!name) {
            try {
              const token = await authService.getValidAccessToken();
              const profileUrl = `${API.AUTH_URL}/profile?token=${token}`;
              const profileResult = await apiClient.request(profileUrl, { method: "GET" });
              if (profileResult.success && profileResult.data?.user?.name) {
                name = profileResult.data.user.name;
              }
            } catch (_) {}
          }

          // Fallback to stored user name
          if (!name && user.name) {
            name = user.name;
          }
          if (!name) name = "Consumer";

          if (isMounted) {
            setProfileData({
              name,
              consumerId: consumerId || user.identifier || "-",
            });
          }
        } catch (error) {
          console.error('Error fetching profile for SideMenu:', error);
          if (isMounted) {
            getUser().then((u) => {
              setProfileData({
                name: u?.name || "Consumer",
                consumerId: u?.consumerNumber || u?.identifier || "-",
              });
            });
          }
        } finally {
          if (isMounted) setIsUserLoading(false);
        }
      };
      fetchProfileData();
      return () => { isMounted = false; };
    }, [])
  );

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
    <View style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}>
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
          <Notification width={18} height={18} fill={COLORS.brandBlueColor} />
        </Pressable>
      </View>
      {/* Profile Section - Clickable to navigate to ProfileScreenMain */}
      <Pressable 
        style={styles.profileSection}
        onPress={() => navigation.navigate("ProfileScreenMain")}
      >
        <View style={styles.profileContainer}>
          <View style={styles.profileImageWrapper}>
            <Image 
              source={require("../../assets/images/profile.jpg")} 
              style={styles.gmrLogo}
            />
            <Image 
              source={tenantLogoSource} 
              style={styles.profileImage}
            />
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
    backgroundColor: "rgba(255, 255, 255, 0.08)",
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
    borderColor: "#ffff",
    backgroundColor: "#FFFFFF",
  },
  profileImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: "absolute",
    bottom: 12,
    right: -4,
    // borderWidth: 1,
    // borderColor: COLORS.brandBlueColor,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    color: COLORS.secondaryFontColor,
  },
  profileId: {
    fontSize: 11,
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
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
    top: 60,
    backgroundColor: "#eef8f0",
    borderTopLeftRadius: 30,
    borderBottomLeftRadius: 30,
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
