import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Arrow from "../../assets/icons/upArrow.svg";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import OnBoardingSlides, { SLIDE_COUNT } from "../components/OnBoardingSlides";
import RippleEffect from "../components/RippleEffect";
import Button from "../components/global/Button";

const { width } = Dimensions.get("window");
const ARROW_ANIM_DURATION = 1000;

const OnBoarding = ({ navigation }) => {
  const { isDark, colors: themeColors } = useTheme();
  const moveAnim = useRef(new Animated.Value(20)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, {
          toValue: -20,
          duration: ARROW_ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
          toValue: 20,
          duration: ARROW_ANIM_DURATION,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [moveAnim]);

  const handleButtonPress = useCallback(() => {
    const next = activeIndex + 1;
    if (next < SLIDE_COUNT) {
      scrollRef.current?.scrollTo({ x: next * width, animated: true });
    } else {
      navigation.navigate("Login");
    }
  }, [activeIndex, navigation]);

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style="light" />
      {/* Blue gradient background */}
      <View style={styles.blueBackground} />
      {/* Background Image */}
      <Image
        source={require("../../assets/images/Backgroundimage.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Overlay for better content visibility */}
      <View style={styles.overlay} />

      <RippleEffect />
      <OnBoardingSlides scrollRef={scrollRef} onIndexChange={setActiveIndex} />

      <View style={styles.ButtonBox}>
        <Button style={styles.buttonContainer}
          variant="primary"
          title={activeIndex === SLIDE_COUNT - 1 ? "Get Started" : "Next"}
          onPress={handleButtonPress}
        />
      </View>

      <View style={styles.arrowContainer}>
        <Animated.View style={{ transform: [{ translateY: moveAnim }] }}>
          <Arrow name="angles-up" size={24} color="#fff" />
        </Animated.View>
      </View>

      <View style={styles.loginContainer}>
        <View style={styles.loginContent}>
          <Button
            title="Login"
            variant="secondary"
            size="medium"
            style={styles.loginBox}
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </View>
    </View>
  );
};

export default OnBoarding;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryDarkColor || "#1f255e",
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

  ButtonBox: {
    width: "100%",
    height: 43,
    alignItems: "center",
    marginTop: 40,
    zIndex: 1,
  },
  buttonContainer: {
    width: "80%",
    height: "100%",
    justifyContent: "center",
    borderRadius: 4,
  },
  arrowContainer: {
    height: "15%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loginContainer: {
    width: "100%",
    height: "15%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loginContent: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    width: "80%",
    height: "100%",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  loginBox: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "80%",
    borderRadius: 4,
  },
});