import React, { useState, useCallback } from "react";
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
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import Button from "../components/global/Button";
import Input from "../components/global/Input";
import Logo from "../components/global/Logo";
import OTPInput from "../components/global/OTPInput";
import { COLORS } from "../constants/colors";
import { API_ENDPOINTS } from "../config/apiConfig";
import UserIcon from "../../assets/icons/user.svg";

const screenHeight = Dimensions.get("window").height;

// Demo OTP for development when API is unavailable
const DEMO_OTP = "123456";

const ResetPassword = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { email: initialEmail } = route.params || {};

  const [email, setEmail] = useState(initialEmail || "");
  const [code, setCode] = useState("");
  const [otpError, setOtpError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const params = route.params || {};
      if (params.otpError) {
        setOtpError(true);
        if (params.code != null && params.code !== undefined) {
          setCode(String(params.code).slice(0, 6));
        }
      }
    }, [route.params])
  );

  const handleResetPassword = () => {
    if (!code || code.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit verification code.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    // Demo: only 123456 is accepted as valid OTP
    if (code !== DEMO_OTP) {
      setOtpError(true);
      return;
    }
    setOtpError(false);
    navigation.navigate("SetNewPassword", { email: trimmedEmail, code });
  };

  const handleResendCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert("Error", "Please enter your email address first.");
      return;
    }
    try {
      const response = await fetch(API_ENDPOINTS.auth.forgotPassword(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await response.json();
      if (data.status === "success") {
        Alert.alert("Success", "A new verification code has been sent.");
      } else {
        Alert.alert("Error", data.message || "Unable to resend code.");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const handleBackToLogin = () => {
    if (navigation?.navigate) {
      navigation.navigate("Login");
    }
  };

  const handleGetOTP = () => {
    navigation.navigate("ForgotPassword");
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
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              variant="default"
              size="medium"
              rightIcon={<UserIcon width={18} height={18} />}
            />

            <OTPInput
              length={6}
              label={null}
              value={code}
              onChange={(val) => {
                setCode(val);
                setOtpError(false);
              }}
              error={otpError ? "Invalid OTP. The code doesn't match. Please check your email." : undefined}
              errorStyle={styles.otpErrorText}
              style={styles.otpWrapper}
            />

            <Pressable onPress={handleResendCode} style={styles.resendWrap}>
              <Text style={styles.resendText}>Resend Code</Text>
            </Pressable>

            <Button
              title="Reset Password"
              onPress={handleResetPassword}
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
              <Pressable style={styles.otpButton} onPress={handleGetOTP}>
                <Text style={styles.otpText}>Get OTP</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ResetPassword;

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
    marginTop: 18,
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
  otpWrapper: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  otpErrorText: {
    color: '#FF4444',
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
    fontFamily: "Manrope-Medium",
    width: "80%",
  },
  resendWrap: {
    alignItems: "center",
    marginBottom: 20,
  },
  resendText: {
    color: COLORS.secondaryColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
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
    marginTop: 32,
    alignItems: "center",
  },
  straightLine: {
    width: "40%",
    backgroundColor: "#e9eaee",
    marginTop: 24,
    height: 2,
    alignSelf: "center",
  },
  orContainer: {
    backgroundColor: "#ffffff",
    width: 32,
    height: 32,
    borderRadius: 16,
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
