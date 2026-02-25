import React, { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import BiLogo from "../../assets/icons/LogoWhite.svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  interpolate,
  cancelAnimation,
  Easing,
} from "react-native-reanimated";

const RING_COUNT = 8;
const RING_DELAY = 600;
const ANIMATION_DURATION = 4000;
const TOTAL_DURATION = RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION;

const Ring = React.memo(({ index, progress }) => {
  const ringStyle = useAnimatedStyle(() => {
    const delay = index * RING_DELAY;
    const localProgress = Math.max(0, progress.value - delay) / ANIMATION_DURATION;
    const clamped = Math.min(localProgress, 1);

    return {
      opacity: interpolate(clamped, [0, 0.1, 1], [0, 0.6, 0]),
      transform: [{ scale: interpolate(clamped, [0, 1], [0.4, 4]) }],
    };
  });

  return <Animated.View style={[styles.ring, ringStyle]} />;
});

Ring.displayName = "Ring";

const RippleEffect = ({ children, paused = false }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (paused) {
      cancelAnimation(progress);
      progress.value = 0;
    } else {
      progress.value = withRepeat(
        withTiming(TOTAL_DURATION, {
          duration: TOTAL_DURATION,
          easing: Easing.inOut(Easing.ease),
        }),
        -1
      );
    }
  }, [paused, progress]);

  const rings = useMemo(
    () => Array.from({ length: RING_COUNT }, (_, i) => i),
    []
  );

  return (
    <View style={styles.logoContainer}>
      {rings.map((index) => (
        <Ring key={index} index={index} progress={progress} />
      ))}
      {children || <BiLogo width={60} height={60} />}
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
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