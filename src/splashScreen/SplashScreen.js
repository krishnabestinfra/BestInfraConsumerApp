import React, { useEffect } from "react";
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

  useEffect(() => {
    const checkLoginStatus = async () => {
      const user = await getUser();
      setTimeout(() => {
        if (user) {
          // navigation.replace("Dashboard");
          navigation.replace("PostPaidDashboard");
        } else {
          navigation.replace("OnBoarding");
        }
      }, 3000); // Reduced from 7s to 3s for better UX
    };
    checkLoginStatus();
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