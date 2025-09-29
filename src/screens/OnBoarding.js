import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Arrow from "../../assets/icons/upArrow.svg";
import { COLORS } from "../constants/colors";
import OnBoardingSlides from "../components/OnBoardingSlides";
import RippleEffect from "../components/RippleEffect";
import Button from "../components/global/Button";

const { width, height } = Dimensions.get("window");

const OnBoarding = ({ navigation }) => {
  const moveAnim = useRef(new Animated.Value(20)).current;
  const [activeIndex, setActiveIndex] = useState(0); 
  const scrollRef = useRef(null); 
  
  
//   useEffect(() => {
//   const interval = setInterval(() => {
//     setActiveIndex(prev => {
//       const next = (prev + 1) % 3;
//       scrollRef.current?.scrollTo({ x: next * width, animated: true });
//       return next;
//     });
//   }, 3000);

//   return () => clearInterval(interval);
// }, []);

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

  // Button slide

const handleButtonPress = () => {
  const next = activeIndex + 1;
  if (next < 3) {
    scrollRef.current?.scrollTo({ x: next * width, animated: true });
    setActiveIndex(next);
  } else {
    navigation.navigate("Login"); // Navigate only when next index exceeds last slide
  }
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
      <OnBoardingSlides  scrollRef={scrollRef} onIndexChange={setActiveIndex}  /> 

      <View style={styles.ButtonBox}>
        <Button style={styles.buttonContainer} 
          variant="primary" 
          title={activeIndex === 2 ? "Get Started" : "Next"}
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
          <Text style={styles.donthavetext}>
            Don't have an account? Need Help!
          </Text>
          <Button 
           title="Login" 
           variant="secondary"
            size="small" 
            style={styles.loginBox} 
            onPress={()=>navigation.navigate('Login')}
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
});
