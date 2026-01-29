import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Button from "../components/global/Button";
import Input from "../components/global/Input";
import Logo from "../components/global/Logo";
import { COLORS } from "../constants/colors";
import UserIcon from "../../assets/icons/user.svg";

const screenHeight = Dimensions.get("window").height;

const ForgotPassword = ({ navigation }) => {
  const [identifier, setIdentifier] = useState("");

  const handleForgotPassword = async () => {
    try {
      if (!identifier.trim()) {
        Alert.alert(
          "Error",
          "Please enter your registered email address or phone number."
        );
        return;
      }

      const response = await fetch(
        "http://192.168.1.33:3000/api/v1/auth/forgot-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: identifier.trim() }),
        }
      );

      const data = await response.json();

      if (data.status === "success") {
        Alert.alert(
          "Success",
          "If this account exists, you will receive a verification code shortly."
        );
      } else {
        Alert.alert("Error", data.message || "Unable to send verification code.");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const handleBackToLogin = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={["#55b56c", "#2a6f65", "#1f3d6d", "#163b7c"]}
        start={{ x: 0.5, y: 1.3 }}
        end={{ x: 0.3, y: 0.5 }}
        style={styles.topGradient}
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

          <View style={styles.textBlock}>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your registered email address or phone number,
              and we&apos;ll send you a verification code to reset your
              password.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label={null}
              placeholder="Email Address"
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              keyboardType="email-address"
              variant="default"
              size="medium"
              rightIcon={<UserIcon width={18} height={18} />}
            />

            <Button
              title="Send Verification Code"
              onPress={handleForgotPassword}
              variant="primary"
              size="large"
              style={styles.submitButton}
            />

            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>Remember your password?</Text>
              <Pressable onPress={handleBackToLogin} style={styles.backToLoginButton}>
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </Pressable>
            </View>

            <View style={styles.orSection}>
            <View style={styles.straightLine} />
            <View style={styles.orContainer}>
              <Text style={styles.orText}>OR</Text>
            </View>

            <Pressable
              style={styles.otpButton}
              onPress={() => navigation.navigate("OTPLogin")}
            >
              <Text style={styles.otpText}>Get OTP</Text>
            </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPassword;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  topGradient: {
    height: screenHeight * 0.2,
    width: "100%",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  subContainer: {
    padding: 30,
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
  textBlock: {
    alignItems: "center",
    marginTop: 32,
  },
  title: {
    color: COLORS.primaryFontColor,
    fontSize: 24,
    fontFamily: "Manrope-Bold",
  },
  subtitle: {
    marginTop: 12,
    color: COLORS.primaryFontColor,
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Regular",
  },
  formContainer: {
    marginTop: 32,
  },
  submitButton: {
    marginTop: 12,
    width: "100%",
  },
  rememberRow: {
    marginTop: 24,
    alignItems: "center",
  },
  rememberText: {
    color: COLORS.primaryFontColor,
    fontSize: 13,
    fontFamily: "Manrope-Regular",
  },
  backToLoginButton: {
    marginTop: 4,
  },
  backToLoginText: {
    color: COLORS.secondaryColor,
    fontSize: 13,
    fontFamily: "Manrope-Medium",
  },
  orSection: {
    marginTop: 90,
    paddingVertical: 60,
  },
  straightLine: {
    width: "40%",
    backgroundColor: "#e9eaee",
    marginTop: 40,
    height: 2,
    alignSelf: "center",
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
  orText: {
    color: COLORS.primaryFontColor,
    fontSize: Platform.OS === "ios" ? 14 : 12,
    fontFamily: "Manrope-SemiBold",
    textAlign: "center",
  },
  otpButton: {
    marginTop: 20,
    alignItems: "center",
  },
  otpText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Medium",
  },
});
