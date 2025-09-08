import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
  Alert,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import LoginForm from "./LoginForm";
import { storeUser } from "../utils/storage";
import Button from "../components/global/Button";
import Logo from "../components/global/Logo";
import EmailLogin from "./EmailLogin";
import MobileLogin from "./MobileLogin";

const screenHeight = Dimensions.get("window").height;

const Login = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      if (email === "user123" && password === "pass123") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const userData = {
          name: "Demo User",
          email: email,
          uid: email
        };
        
        await storeUser(userData);
        navigation.navigate("Dashboard");
      } else {
        Alert.alert(
          "Login Failed",
          "Invalid credentials. Please use the dummy credentials or check your login details.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Login Error",
        "Something went wrong. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#55b56c", "#2a6f65", "#1f3d6d", "#163b7c"]}
        start={{ x: 0.5, y: 1.3 }}
        end={{ x: 0.3, y: 0.5 }}
        style={{
          height: screenHeight * 0.2,
          width: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.subContainer}
          keyboardShouldPersistTaps="handled"
        >
            <View style={styles.imageContainer}>
              <LinearGradient
                colors={["#163b7c", "#1f3d6d", "#2a6f65", "#55b56c"]}
                start={{ x: 0.5, y: 1 }}
                end={{ x: 1.2, y: 0.2 }}
                style={styles.gradientBackground}
              >
                <Logo variant="white" size="large" />
              </LinearGradient>
            </View>

            <View style={styles.TextContainer}>
              <Text style={styles.welcomeText}>Welcome</Text>
              <Text style={styles.bestinfraText}>to Best Infra</Text>
            </View>
            <View style={styles.TextContainer}>
              <Text style={styles.LoginText}>
              Access your smart meter data, monitor energy usage, and manage everything seamlessly — all within one secure platform.
              </Text>
            </View>
            <LoginForm
              email={email}
              password={password}
              checked={checked}
              setEmail={setEmail}
              setPassword={setPassword}
              setChecked={setChecked}
              handleLogin={handleLogin}
              navigation={navigation}
              isLoading={isLoading}
            />
            {/* <EmailLogin
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              checked={checked}
              setChecked={setChecked}
              handleLogin={handleLogin}
              navigation={navigation}
              isLoading={isLoading}
            /> */}
            {/* <MobileLogin
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              checked={checked}
              setChecked={setChecked}
              handleLogin={handleLogin}
              navigation={navigation}
              isLoading={isLoading}
            /> */}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  imageContainer: {
    alignItems: "center",
    marginTop: 80,
    width: "100%",
    zIndex: 9999999,
  },
  gradientBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1f255e",
    ...Platform.select({
      ios: {
        shadowColor: COLORS.primaryFontColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  subContainer: {
    padding: 30,
  },
  TextContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  welcomeText: {
    color: COLORS.primaryFontColor,
    fontSize: 24,
    fontFamily: "Manrope-Bold",
  },
  bestinfraText: {
    color: COLORS.primaryFontColor,
    fontSize: 24,
    fontFamily: "Manrope-Bold",
  },
  LoginText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Regular",
  },
  allText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Regular",
  },

  orContainer: {
    backgroundColor: "#e9eaee",
    width: 32,
    height: 32,
    borderRadius: 35,
    alignSelf: "center",
    justifyContent: "center",
    zIndex: 9,
    marginTop: -18,
  },
  straightLine: {
    width: "40%",
    backgroundColor: "#e9eaee",
    marginTop: 40,
    height: 2,
    alignSelf: "center",
  },
  orText: {
    color: COLORS.primaryFontColor,
    fontSize: Platform.OS === "ios" ? 14 : 12,
    textAlign: "center",
    verticalAlign: "middle",
    fontFamily: "Manrope-SemiBold",
  },
  guestContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#e9eaee",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 20,
  },
  guestText: {
    color: COLORS.primaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Medium",
  },
});
