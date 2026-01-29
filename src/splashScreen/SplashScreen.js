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
        
        // Proceed with normal app flow
        await proceedToMainApp();
        
      } catch (error) {
        console.error('❌ Error during app initialization:', error);
        // On error, proceed to main app (graceful degradation)
        await proceedToMainApp();
      }
    };

    const proceedToMainApp = async () => {
      // Check remember me preference first
      const rememberMe = await authService.getRememberMe();
      
      // If remember me is false, clear all auth data (tokens and user)
      if (!rememberMe) {
        console.log(' Remember me is disabled, clearing authentication data');
        await authService.clearAllAuthData();
      }
      
      // Check if user is authenticated (has valid tokens)
      const isAuthenticated = await authService.isAuthenticated();
      const user = await getUser();
      
      // Add minimum splash time for better UX
      setTimeout(() => {
        setSplashComplete(true);
        if (rememberMe && isAuthenticated && user) {
          // User has remember me enabled and is authenticated - go directly to dashboard
          // Reset navigation stack to prevent going back to splash/onboarding
          console.log('✅ User authenticated with remember me enabled, navigating to dashboard');
          navigation.reset({
            index: 0,
            routes: [{ name: "PostPaidDashboard" }],
          });
        } else {
          // No valid authentication or remember me disabled - show onboarding/login
          console.log(' No valid authentication or remember me disabled, navigating to onboarding');
          navigation.reset({
            index: 0,
            routes: [{ name: "OnBoarding" }],
          });
        }
      }, 8000); // Minimum 8 seconds splash time
    };

    initializeApp();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Blue gradient background */}
      <View style={styles.blueBackground} />
      
      <Image 
        source={require("../../assets/images/onboardingbg.png")} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Overlay for better content visibility */}
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
    // backgroundColor: COLORS.primaryDarkColor || "#1f255e",
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
    backgroundColor: "rgba(0, 0, 0, 0.1)", // Subtle overlay for better content visibility
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    zIndex: 1, // Ensure content is above background
  },
});