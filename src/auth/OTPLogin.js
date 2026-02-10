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
import { useTheme } from "../context/ThemeContext";
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
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s24 = getScaledFontSize(24);
  const s14 = getScaledFontSize(14);
  const s12 = getScaledFontSize(12);
  const sOr = getScaledFontSize(Platform.OS === "ios" ? 14 : 12);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [remember, setRemember] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailError) setEmailError("");
    // Reset OTP sent state if email changes after OTP was sent
    if (otpSent) {
      setOtpSent(false);
      setOtp("");
      setResendSeconds(0);
    }
  };

  const handleGenerateOTP = () => {
    // Validate email first
    if (!email.trim()) {
      setEmailError("Please enter your email address");
      return;
    }
    
    if (!validateEmail(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError("");
    setOtpError("");
    setOtp("");
    setIsLoading(true);
    // Simulate API call to send OTP
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
      setResendSeconds(OTP_RESEND_SECONDS);
      Alert.alert(
        "OTP Sent",
        `A 6-digit code has been sent to ${email.trim()}`
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
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}>
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
          style={[styles.subContainer, isDark && { backgroundColor: themeColors.screen }]}
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
            <Text style={[styles.title, { fontSize: s24 }]}>OTP Login</Text>
            <Text style={[styles.subtitle, { fontSize: s14 }]}>
              Enter your registered email address, and we&apos;ll send you a
              6-digit verification code to complete your login.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label={null}
              placeholder="Email"
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              variant="default"
              size="medium"
              rightIcon={<User width={18} height={18} fill={COLORS.primaryFontColor} />}
              style={styles.phoneInput}
              error={emailError}
              autoFocus={!otpSent}
              editable={!isLoading && !otpSent}
            />

            {otpSent && (
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
            )}

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
                <Text style={[styles.rememberText, { fontSize: s14 }]}>Remember</Text>
              </Pressable>
            </View>

            <Button
              title={isLoading ? "Generating OTP..." : "Generate OTP"}
              variant="primary"
              size="large"
              style={styles.generateButton}
              onPress={handleGenerateOTP}
              loading={isLoading}
              disabled={isLoading || !email.trim() || !validateEmail(email.trim())}
            />

            {otpSent && resendSeconds > 0 && (
            <Pressable
              style={styles.resendRow}
              onPress={() => canResend && handleGenerateOTP()}
              disabled={!canResend}
            >
              <Text style={[styles.resendText, { fontSize: s14 }]}>Did not receive the code? </Text>
              <Text
                style={[
                  styles.timerText,
                  { fontSize: s14 },
                  canResend && styles.timerTextLink,
                ]}
              >
                  Resend in {formatTimer(resendSeconds)}
                </Text>
              </Pressable>
            )}

            {otpSent && resendSeconds === 0 && (
              <Pressable
                style={styles.resendRow}
                onPress={() => handleGenerateOTP()}
                disabled={isLoading}
              >
                <Text style={[styles.resendText, { fontSize: s14 }]}>Did not receive the code? </Text>
                <Text
                  style={[
                    styles.timerText,
                    { fontSize: s14 },
                    styles.timerTextLink,
                  ]}
                >
                  Resend OTP
              </Text>
            </Pressable>
            )}
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
  phoneInput: {
    marginBottom: 8,
  },
  helperText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    marginTop: -8,
    marginBottom: 16,
    paddingLeft: 4,
    opacity: 0.7,
  },
  otpInputContainer: {
    marginTop: 8,
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
    // paddingVertical: 50,
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
    marginTop: 16,
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
