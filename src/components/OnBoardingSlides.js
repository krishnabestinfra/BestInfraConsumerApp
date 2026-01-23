import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { COLORS } from "../constants/colors";

const { width } = Dimensions.get("window");

const OnBoardingSlides = ({ scrollRef, onIndexChange}) => {
  const [activeIndex, setActiveIndex] = useState(0); // State for the active slide index

  const currentIndex = useRef(0);
  const slides = [0, 1, 2]; // Just placeholders for the static views

  const animatedValues = useRef(slides.map(() => new Animated.Value(10))).current;
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     currentIndex.current = (currentIndex.current + 1) % slides.length;
  //     setActiveIndex(currentIndex.current); // Update active index
  //     scrollRef.current.scrollTo({
  //       x: currentIndex.current * width,
  //       animated: true,
  //     });
  //   }, 3000);

  //   return () => clearInterval(interval);
  // }, []);
//   useEffect(() => {
//   const interval = setInterval(() => {
//     currentIndex.current = (currentIndex.current + 1) % slides.length;
//     setActiveIndex(currentIndex.current);
//     onIndexChange?.(currentIndex.current);   
//     scrollRef.current.scrollTo({
//       x: currentIndex.current * width,
//       animated: true,
//     });
//   }, 3000);

//   return () => clearInterval(interval);
// }, []);


  useEffect(() => {
    animatedValues.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: index === activeIndex ? 25 : 10,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  }, [activeIndex]);


  return (
    <View
      style={{
        height: "20%",
        marginTop: -60,
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true} // disables manual swipe
        onScroll={(event) => {
          const contentOffsetX = event.nativeEvent.contentOffset.x;
          const index = Math.round(contentOffsetX / width); // Use Math.round to handle fractional values
          setActiveIndex(index); // Update the active index based on scroll position
          onIndexChange?.(index);
        }}
      >
        {/* Slide 1 */}
        <View style={styles.slide}>
          <Text style={styles.title}>No More</Text>
          <Text style={styles.title}>Billing Disputes</Text>
          <Text style={styles.description}>
            Transparent and highly precise digital smart meter readings ensure truly accurate, error-free bills every month.
          </Text>
        </View>

        {/* Slide 2 */}
        <View style={styles.slide}>
          <Text style={styles.title}>Track Your</Text>
          <Text style={styles.title}>Energy Smarter</Text>
          <Text style={styles.description}>
            Clear daily and detailed monthly insights helpyou easily control energy usage and consistantly save valuable energy costs.
          </Text>
        </View>

        {/* Slide 3 */}
        <View style={styles.slide}>
          <Text style={styles.title}>Your Power.</Text>
          <Text style={styles.title}>Your Control.</Text>
          <Text style={styles.description}>
            Recharge instantly, securely check payments, and easily manage your account anytime, anywhere with ease.
          </Text>
        </View>
      </ScrollView>

      {/* Active Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: animatedValues[index],
                backgroundColor: index === activeIndex ? "#fff" : "grey",
              }
              // index === activeIndex ? styles.activeDot : null, // Style active dot
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  ////// new sliders \\\\\\
  slide: {
    width,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    ...Platform.select({
      ios: {
        paddingTop: 50, // Add top padding specifically for iOS
      },
      android: {
        paddingTop: 30, // Add top padding for Android
      },
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
        fontSize: 18, // Larger text for iOS
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
  // activeDot: {
  //   backgroundColor: "#00e09f", // Active dot color
  // },
});

export default OnBoardingSlides;
