import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
  Pressable,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import Logo from "../components/global/Logo";
import Button from "../components/global/Button";
import Input from "../components/global/Input";
import OTPInput from "../components/global/OTPInput";
import Tick from "../../assets/icons/tick.svg";
import User from "../../assets/icons/user.svg";

const screenHeight = Dimensions.get("window").height;
const OTP_RESEND_SECONDS = 30;

const OTPLogin = ({ navigation }) => {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const handleGenerateOTP = () => {
    setOtpError("");
    setOtp("");
    setIsLoading(true);
    // Simulate API call to send OTP
    setTimeout(() => {
      setIsLoading(false);
      setResendSeconds(OTP_RESEND_SECONDS);
      Alert.alert(
        "OTP Sent",
        "A 6-digit code has been sent to your registered mobile number."
      );
    }, 800);
  };

  const handleOTPChange = (value) => {
    setOtp(value);
    if (otpError) setOtpError("");
  };

  const handleOTPComplete = (value) => {
    // Demo: accept 123456 or any 6 digits for testing
    if (value === "123456" || value.length === 6) {
      setOtpError("");
      // Navigate to dashboard on success (same as Login flow)
      navigation.reset({
        index: 0,
        routes: [{ name: "PostPaidDashboard" }],
      });
    } else {
      setOtpError("Invalid OTP. Please try again.");
    }
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const canResend = resendSeconds <= 0 && !isLoading;

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
            <Text style={styles.welcomeTitle}>
              Welcome to Best Infra for GMR Customers
            </Text>
            <Text style={styles.subtitle}>
              Access your smart meter data, monitor energy usage, and manage
              everything seamlessly - all within one secure platform.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label={null}
              placeholder="Email"
              value={phone}
              onChangeText={setPhone}
              keyboardType="email-address"
              variant="default"
              size="medium"
              rightIcon={<User width={18} height={18} fill={COLORS.primaryFontColor} />}
              style={styles.phoneInput}
            />

            <View style={styles.otpInputContainer}>
              <OTPInput
                length={6}
                value={otp}
                onChange={handleOTPChange}
                onComplete={handleOTPComplete}
                error={otpError}
                disabled={isLoading}
                style={styles.otpInputWrapper}
              />
            </View>

            <View style={styles.rememberRow}>
              <Pressable
                style={styles.checkboxContainer}
                onPress={() => !isLoading && setRemember(!remember)}
                disabled={isLoading}
              >
                <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                  {remember && (
                    <Tick size={14} fill={COLORS.secondaryFontColor} />
                  )}
                </View>
                <Text style={styles.rememberText}>Remember</Text>
              </Pressable>
            </View>

            <Button
              title={isLoading ? "Generating OTP..." : "Generate OTP"}
              variant="primary"
              size="large"
              style={styles.generateButton}
              onPress={handleGenerateOTP}
              loading={isLoading}
              disabled={isLoading}
            />

            <View style={styles.orSection}>
              <View style={styles.straightLine} />
              <View style={styles.orContainer}>
                <Text style={styles.orText}>OR</Text>
              </View>
            </View>

            <Pressable
              style={styles.resendRow}
              onPress={() => canResend && handleGenerateOTP()}
              disabled={!canResend}
            >
              <Text style={styles.resendText}>Did not receive the code? </Text>
              <Text
                style={[
                  styles.timerText,
                  canResend && styles.timerTextLink,
                ]}
              >
                ({formatTimer(resendSeconds)})
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OTPLogin;

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
  welcomeTitle: {
    color: COLORS.primaryFontColor,
    fontSize: 22,
    fontFamily: "Manrope-Bold",
    textAlign: "center",
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
  phoneInput: {
    marginBottom: 16,
  },
  otpInputContainer: {
    marginBottom: 16,
    width: "100%",
  },
  otpInputWrapper: {
    width: "100%",
  },
  rememberRow: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: COLORS.secondaryColor,
    borderColor: COLORS.secondaryColor,
  },
  rememberText: {
    color: COLORS.secondaryColor,
    fontSize: 14,
    fontFamily: "Manrope-Medium",
    marginLeft: 10,
  },
  generateButton: {
    width: "100%",
  },
  orSection: {
    marginTop: 24,
    paddingVertical: 50,
  },
  straightLine: {
    width: "40%",
    backgroundColor: "#e9eaee",
    marginTop: 24,
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
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  resendText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  timerText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Regular",
  },
  timerTextLink: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Medium",
  },
});
