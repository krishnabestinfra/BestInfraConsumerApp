import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Image, Dimensions, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import BiLogo from "../../assets/icons/LogoWhite.svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Easing } from "react-native-reanimated";

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

const RippleEffect = () => {
  const progress = useSharedValue(0);

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
  return (
    <View style={styles.logoContainer}>
        {Array.from({ length: RING_COUNT }).map((_, index) => (
          <Ring key={index} index={index} progress={progress} />
        ))}
        <BiLogo width={60} height={60} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f255e",
  },
  logoContainer: {
    left: width / 2 - 55,
    width: 110,
    alignItems: "center",
    justifyContent: "center",
    height: "40%",
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
    opacity:0.2
  },
});

export default RippleEffect;