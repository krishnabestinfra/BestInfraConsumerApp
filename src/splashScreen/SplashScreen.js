import React, { useEffect, useState } from "react";
import { View, StyleSheet, Image, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Logo from "../components/global/Logo";
import AnimatedRings from "../components/global/AnimatedRings";

const { width, height } = Dimensions.get("window");

const getUser = async () => {
  try {
    const userData = await AsyncStorage.getItem("user"); 
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    return null;
  }
};

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
      const user = await getUser();
      
      // Add minimum splash time for better UX
      setTimeout(() => {
        setSplashComplete(true);
        if (user) {
          // User is already logged in - go directly to dashboard
          // Reset navigation stack to prevent going back to splash/onboarding
          navigation.reset({
            index: 0,
            routes: [{ name: "PostPaidDashboard" }],
          });
        } else {
          // No user - show onboarding
          navigation.reset({
            index: 0,
            routes: [{ name: "OnBoarding" }],
          });
        }
      }, 2000); // Minimum 2 seconds splash time
    };

    initializeApp();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <Image 
        source={require("../../assets/images/onboardingbg.png")} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      <View style={styles.overlay} />
      
      <View style={styles.centerWrapper}>
        <AnimatedRings count={3} loop={true} />
        <Logo variant="white" size="large" />
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f255e",
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
    backgroundColor: "rgba(0, 0, 0, 0.3)", // Semi-transparent overlay for better text visibility
  },
  centerWrapper: {
    flex: 1,
    justifyContent: "center", // Center vertically
    alignItems: "center", // Center horizontally
    zIndex: 1, // Ensure content is above background
  },
});