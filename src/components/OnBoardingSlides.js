import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

const SLIDES_DATA = [
  {
    id: "billing",
    lines: ["No More", "Billing Disputes"],
    description:
      "Transparent and highly precise digital smart meter readings ensure truly accurate, error-free bills every month.",
  },
  {
    id: "energy",
    lines: ["Track Your", "Energy Smarter"],
    description:
      "Clear daily and detailed monthly insights help you easily control energy usage and consistently save valuable energy costs.",
  },
  {
    id: "control",
    lines: ["Your Power.", "Your Control."],
    description:
      "Recharge instantly, securely check payments, and easily manage your account anytime, anywhere with ease.",
  },
];

export const SLIDE_COUNT = SLIDES_DATA.length;

const DOT_ACTIVE_WIDTH = 25;
const DOT_INACTIVE_WIDTH = 10;
const DOT_ANIM_DURATION = 300;

const DotIndicator = React.memo(({ index, isActive }) => {
  const widthAnim = useSharedValue(isActive ? DOT_ACTIVE_WIDTH : DOT_INACTIVE_WIDTH);

  useEffect(() => {
    widthAnim.value = withTiming(isActive ? DOT_ACTIVE_WIDTH : DOT_INACTIVE_WIDTH, {
      duration: DOT_ANIM_DURATION,
    });
  }, [isActive, widthAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: widthAnim.value,
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        animatedStyle,
        { backgroundColor: isActive ? "#fff" : "grey" },
      ]}
    />
  );
});

DotIndicator.displayName = "DotIndicator";

const OnBoardingSlides = React.memo(({ scrollRef, onIndexChange }) => {
  const { getScaledFontSize } = useTheme();
  const s24 = getScaledFontSize(24);
  const s18 = getScaledFontSize(Platform.OS === "ios" ? 18 : 15);
  const [activeIndex, setActiveIndex] = useState(0);
  const currentIndexRef = useRef(0);

  const handleMomentumScrollEnd = useCallback(
    (event) => {
      const contentOffsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(contentOffsetX / width);
      if (index !== currentIndexRef.current && index >= 0 && index < SLIDE_COUNT) {
        currentIndexRef.current = index;
        setActiveIndex(index);
        onIndexChange?.(index);
      }
    },
    [onIndexChange]
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {SLIDES_DATA.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            {slide.lines.map((line, i) => (
              <Text key={i} style={[styles.title, { fontSize: s24 }]}>
                {line}
              </Text>
            ))}
            <Text style={[styles.description, { fontSize: s18 }]}>
              {slide.description}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsContainer}>
        {SLIDES_DATA.map((_, index) => (
          <DotIndicator key={index} index={index} isActive={index === activeIndex} />
        ))}
      </View>
    </View>
  );
});

OnBoardingSlides.displayName = "OnBoardingSlides";

const styles = StyleSheet.create({
  wrapper: {
    height: "20%",
    marginTop: -60,
  },
  slide: {
    width,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    ...Platform.select({
      ios: { paddingTop: 50 },
      android: { paddingTop: 5 },
    }),
  },
  title: {
    fontSize: 24,
    fontFamily: "Manrope-Bold",
    color: COLORS.secondaryFontColor,
    ...Platform.select({
      ios: {
        fontSize: 25, // Larger font on iOS
      },
      android: {
        fontSize: 24, // Smaller font on Android
      },
    }),
  },
  description: {
    fontSize: 14,
    color: COLORS.secondaryFontColor,
    marginTop: 10,
    fontFamily: "Manrope-Regular",
    textAlign: "center",
    ...Platform.select({
      ios: {
        fontSize: 18, 
      },
      android: {
        fontSize: 15, // Standard text size for Android
      },
    }),
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    top: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    margin: 5,
  },
});

export default OnBoardingSlides;