import React, { useEffect, useState } from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { getUser, isUserLoggedIn } from "../utils/storage";
import { authService } from "../services/authService";
import Logo from "../components/global/Logo";
import RippleEffect from "../components/RippleEffect";
import { COLORS } from "../constants/colors";

const { width, height } = Dimensions.get("window");

const SplashScreen = () => {
  const navigation = useNavigation();
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        await proceedToMainApp();
      } catch (error) {
        console.error('❌ Error during app initialization:', error);
        await proceedToMainApp();
      }
    };

    const proceedToMainApp = async () => {
      const rememberMe = await authService.getRememberMe();
      if (!rememberMe) {
        console.log(' Remember me is disabled, clearing authentication data');
        await authService.clearAllAuthData();
      }

      const isAuthenticated = await authService.isAuthenticated();
      const user = await getUser();

      if (rememberMe && isAuthenticated && user) {
        console.log('✅ User authenticated with remember me enabled, navigating to dashboard');
        setTimeout(() => {
          setSplashComplete(true);
          navigation.reset({
            index: 0,
            routes: [{ name: "PostPaidDashboard" }],
          });
        }, 500);
      } else {
        console.log(' No valid authentication or remember me disabled, navigating to onboarding');
        setTimeout(() => {
          setSplashComplete(true);
          navigation.reset({
            index: 0,
            routes: [{ name: "OnBoarding" }],
          });
        }, 5000);
      }
    };

    initializeApp();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.blueBackground} />
      <Image
        source={require("../../assets/images/onboardingbg.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <View style={styles.centerWrapper}>
        <RippleEffect>
          <Logo variant="white" size="large" />
        </RippleEffect>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blueBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primaryDarkColor || "#1f255e",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});