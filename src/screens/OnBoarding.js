import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  ScrollView,
  Image,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Arrow from "react-native-vector-icons/FontAwesome6";
import BiLogo from "../../assets/icons/LogoWhite.svg";
import { COLORS } from "../constants/colors";
import OnBoardingSlides from "../components/OnBoardingSlides";
import RippleEffect from "../components/RippleEffect";
import Button from "../components/global/Button";

const { width, height } = Dimensions.get("window");

const OnBoarding = ({ navigation }) => {
  const moveAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, {
          toValue: -20,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
          toValue: 20,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [moveAnim]);

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.floor(contentOffsetX / width);
    setActiveIndex(index); // Update active index based on scroll position
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Background Image */}
      <Image 
        source={require("../../assets/images/Backgroundimage.png")} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Overlay for better content visibility */}
      <View style={styles.overlay} />

      <RippleEffect />
      <OnBoardingSlides />

      <View style={styles.ButtonBox}>
        <Button style={styles.buttonContainer} variant="primary" title="Get Started" onPress={()=>navigation.navigate('Login')}/>
      </View>

      <View style={styles.arrowContainer}>
        <Animated.View style={{ transform: [{ translateY: moveAnim }] }}>
          <Arrow name="angles-up" size={24} color="#fff" />
        </Animated.View>
      </View>
    

      <View style={styles.loginContainer}>
        <View style={styles.loginContent}>
          <Text style={styles.donthavetext}>
            Don't have an account? Need Help!
          </Text>
          <Button title="Login" variant="secondary" size="small" style={styles.loginBox} onPress={()=>navigation.navigate('Login')}/>
        </View>
      </View>
    </View>
  );
};

export default OnBoarding;

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
    height: height,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)", // Semi-transparent overlay for better content visibility
  },
  /////// button \\\\\\
  ButtonBox: {
    width: "100%",
    height: 43,
    alignItems: "center",
    marginTop: 40,
    zIndex: 1, // Ensure button is above background
  },
  buttonContainer: {
    width: "80%",
    height: "100%",
    justifyContent: "center",
    borderRadius: 4,
  },
  getStartText: {
    color: COLORS.secondaryFontColor,
    textAlign: "center",
    fontSize: 14,
    fontFamily: "Manrope-Medium",
  },

  /////Arrow \\\\\\
  arrowContainer: {
    height: "15%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1, // Ensure arrow is above background
  },
  ////// login container \\\\\\\
  loginContainer: {
    width: "100%",
    height: "15%",
    justifyContent: "center",
    display: "flex",
    alignItems: "center",
    zIndex: 1, // Ensure login container is above background
  },
  loginContent: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    width: "80%",
    height: "100%",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  donthavetext: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  loginBox: {
    padding: 10,
    width: "80%",
    borderRadius: 4,
  },
  loginText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Medium",
  },
});
