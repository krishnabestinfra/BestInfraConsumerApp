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
import { API_ENDPOINTS } from "../config/apiConfig";
import { setTenantSubdomain } from "../config/apiConfig";
import { storeUser, extractConsumerInfo } from "../utils/storage";
import { authService } from "../services/authService";
import { apiClient } from "../services/apiClient";
import Logo from "../components/global/Logo";
import Button from "../components/global/Button";
import Input from "../components/global/Input";
import OTPInput from "../components/global/OTPInput";
import Tick from "../../assets/icons/tick.svg";
import User from "../../assets/icons/user.svg";

const screenHeight = Dimensions.get("window").height;
const OTP_RESEND_SECONDS = 30;

// Map identifier prefix to tenant subdomain – works for any consumer in any app
const IDENTIFIER_PREFIX_TO_TENANT = [
  { prefix: "BI25GMRA", tenant: "gmr" },
  { prefix: "BI26NTPA", tenant: "ntpl" },
];
const DEFAULT_TENANT = "gmr";

function resolveTenantFromResponse(data) {
  const raw = data?.data || data;
  const clients = raw?.clients || data?.clients;
  if (Array.isArray(clients) && clients.length > 0) {
    const sub = clients[0].subdomain || clients[0].client;
    if (sub) return String(sub).toLowerCase();
  }
  const sub = raw?.subdomain || raw?.app || data?.subdomain || data?.app;
  if (sub) return String(sub).toLowerCase();
  return null;
}

function resolveTenantFromIdentifier(identifier) {
  if (!identifier || typeof identifier !== "string") return DEFAULT_TENANT;
  const upper = identifier.toUpperCase();
  for (const { prefix, tenant } of IDENTIFIER_PREFIX_TO_TENANT) {
    if (upper.startsWith(prefix)) return tenant;
  }
  return DEFAULT_TENANT;
}

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
  const [isVerifying, setIsVerifying] = useState(false);
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

  const handleGenerateOTP = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError("Please enter your email address");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError("");
    setOtpError("");
    setOtp("");
    setIsLoading(true);
    try {
      const url = API_ENDPOINTS.auth.loginOtp();
      const result = await apiClient.request(url, {
        method: "POST",
        body: { email: trimmedEmail },
        skipAuth: true,
      });
      const data = result.rawBody ?? result.data ?? result;

      if (__DEV__) {
        console.log("[OTPLogin] POST login-otp response:", { ok: result.success, status: result.status, data });
      }

      if (result.success && (data.status === "success" || data.success === true)) {
        setOtpSent(true);
        setResendSeconds(OTP_RESEND_SECONDS);
        Alert.alert("OTP Sent", `A 6-digit code has been sent to ${trimmedEmail}. Only registered emails receive the OTP.`);
      } else {
        const serverMessage = result.error || data?.message || data?.error || "";
        const isUnregistered =
          result.status === 400 ||
          result.status === 404 ||
          /not registered|unknown email|invalid email|not found/i.test(serverMessage);
        const message = isUnregistered
          ? "Only registered email addresses can receive the OTP. Please use the email linked to your account."
          : serverMessage || "Could not send OTP. Please try again.";
        Alert.alert("Error", message);
      }
    } catch (err) {
      if (__DEV__) console.warn("[OTPLogin] login-otp error:", err?.message ?? err);
      const msg = err?.message?.includes("timeout") ? "Request timed out. Please try again." : (err?.message ? `Something went wrong: ${err.message}` : "Something went wrong. Please try again.");
      Alert.alert("Error", msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPChange = (value) => {
    setOtp(value);
    if (otpError) setOtpError("");
  };

  const performVerifyOtpAndLogin = async (otpValue) => {
    const code = typeof otpValue === "string" ? otpValue.trim() : "";
    if (!code || code.length !== 6) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setOtpError("Please enter your email first.");
      return;
    }
    setOtpError("");
    setIsVerifying(true);
    try {
      const url = API_ENDPOINTS.auth.verifyOtp();
      const result = await apiClient.request(url, {
        method: "POST",
        body: { email: trimmedEmail, otp: code },
        skipAuth: true,
      });
      const data = result.rawBody ?? result.data ?? result;

      if (__DEV__) {
        console.log("[OTPLogin] POST verify-otp response:", { ok: result.success, status: result.status, data });
      }

      if (result.success && (data.status === "success" || data.success === true)) {
        try {
          let accessToken = null;
          const responseLike = { headers: { get: (name) => result.headers && result.headers[name?.toLowerCase()] } };
          try {
            const tokens = await authService.handleLoginResponse(responseLike, data);
            accessToken = tokens?.accessToken;
          } catch (tokenErr) {
            if (__DEV__) console.warn("[OTPLogin] Token extraction:", tokenErr?.message);
            accessToken =
              data?.data?.accessToken ||
              data?.data?.gmrAccessToken ||
              data?.data?.token ||
              data?.data?.gmrToken ||
              data?.accessToken ||
              data?.gmrAccessToken ||
              data?.token ||
              null;
            if (accessToken) {
              await authService.storeAccessToken(accessToken);
            }
          }
          const consumerInfo = extractConsumerInfo(data, trimmedEmail);
          const identifier = consumerInfo.identifier || consumerInfo.consumerNumber || trimmedEmail;
          const tenant =
            resolveTenantFromResponse(data) || resolveTenantFromIdentifier(identifier);
          setTenantSubdomain(tenant);
          if (__DEV__) console.log("[OTPLogin] Tenant for this consumer/app:", tenant);
          const userData = {
            name: consumerInfo.name,
            email: consumerInfo.email || trimmedEmail,
            uid: consumerInfo.identifier,
            identifier: consumerInfo.identifier,
            consumerName: consumerInfo.name,
            consumerNumber: consumerInfo.consumerNumber,
            meterSerialNumber: consumerInfo.meterSerialNumber,
            meterId: consumerInfo.meterId,
            uniqueIdentificationNo: consumerInfo.uniqueIdentificationNo,
            accessToken: accessToken || undefined,
          };
          await storeUser(userData);
          await authService.setRememberMe(remember);
          if (__DEV__) {
            console.log("[OTPLogin] Stored user (same shape as password login):", {
              identifier: userData.identifier,
              consumerNumber: userData.consumerNumber,
              uid: userData.uid,
              name: userData.name,
              meterId: userData.meterId,
            });
          }
          try {
            const { getPushToken, registerPushToken } = await import("../services/pushNotificationService");
            const pushToken = await getPushToken();
            if (pushToken) await registerPushToken(pushToken);
          } catch (pushErr) {
            if (__DEV__) console.warn("[OTPLogin] Push register skip:", pushErr?.message);
          }
          navigation.reset({
            index: 0,
            routes: [{ name: "PostPaidDashboard" }],
          });
        } catch (storeErr) {
          if (__DEV__) console.warn("[OTPLogin] Store user/tokens:", storeErr?.message ?? storeErr);
          setOtpError("Login succeeded but session setup failed. Please try again.");
        }
      } else {
        setOtpError(data.message || data.error || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      if (__DEV__) console.warn("[OTPLogin] verify-otp error:", err?.message ?? err);
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOTPComplete = (value) => {
    if (value && value.length === 6) performVerifyOtpAndLogin(value);
  };

  const handleVerifyOTP = () => {
    performVerifyOtpAndLogin(otp);
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const canResend = resendSeconds <= 0 && !isLoading && !isVerifying;

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
          style={[styles.subContainer, isDark && { backgroundColor: "transparent" }]}
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
            <Text style={[styles.title, { fontSize: s24 }, isDark && { color: themeColors.textPrimary }]}>OTP Login</Text>
            <Text style={[styles.subtitle, { fontSize: s14 }, isDark && { color: themeColors.textSecondary }]}>
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
              rightIcon={<User width={18} height={18} fill={isDark ? themeColors.textSecondary : COLORS.primaryFontColor} />}
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
                disabled={isLoading || isVerifying}
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
                <Text style={[styles.rememberText, { fontSize: s14 }, isDark && { color: themeColors.textPrimary }]}>Remember</Text>
              </Pressable>
            </View>

            {!otpSent ? (
              <Button
                title={isLoading ? "Generating OTP..." : "Generate OTP"}
                variant="primary"
                size="medium"
                style={styles.generateButton}
                onPress={handleGenerateOTP}
                loading={isLoading}
                disabled={isLoading || !email.trim() || !validateEmail(email.trim())}
              />
            ) : (
              <Button
                title={isVerifying ? "Verifying..." : "Verify OTP"}
                variant="primary"
                size="medium"
                style={styles.generateButton}
                onPress={handleVerifyOTP}
                loading={isVerifying}
                disabled={isVerifying || otp.length !== 6}
              />
            )}

            {otpSent && resendSeconds > 0 && (
            <Pressable
              style={styles.resendRow}
              onPress={() => canResend && handleGenerateOTP()}
              disabled={!canResend}
            >
              <Text style={[styles.resendText, { fontSize: s14 }, isDark && { color: themeColors.textSecondary }]}>Did not receive the code? </Text>
              <Text
                style={[
                  styles.timerText,
                  { fontSize: s14 },
                  canResend && styles.timerTextLink,
                  isDark && { color: themeColors.accent },
                ]}
              >
                  Resend in {formatTimer(resendSeconds)}
                </Text>
              </Pressable>
            )}

            {otpSent && resendSeconds === 0 && (
              <Pressable
                style={styles.resendRow}
                onPress={() => canResend && handleGenerateOTP()}
                disabled={!canResend}
              >
                <Text style={[styles.resendText, { fontSize: s14 }, isDark && { color: themeColors.textSecondary }]}>Did not receive the code? </Text>
                <Text
                  style={[
                    styles.timerText,
                    { fontSize: s14 },
                    styles.timerTextLink,
                    isDark && { color: themeColors.accent },
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
