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
import { useTheme } from "../context/ThemeContext";
import { API_ENDPOINTS } from "../config/apiConfig";
import { extractUserId } from "../utils/extractUserId";
import { apiClient } from "../services/apiClient";
import UserIcon from "../../assets/icons/user.svg";

const screenHeight = Dimensions.get("window").height;

const ForgotPassword = ({ navigation }) => {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s24 = getScaledFontSize(24);
  const s14 = getScaledFontSize(14);
  const s13 = getScaledFontSize(13);
  const s12 = getScaledFontSize(12);
  const sOr = getScaledFontSize(Platform.OS === "ios" ? 14 : 12);

  const [identifier, setIdentifier] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sending, setSending] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (text) => {
    setIdentifier(text);
    // Real-time validation: clear error if valid, show error if invalid (only after user has typed something)
    if (text.trim()) {
      if (validateEmail(text.trim())) {
        setEmailError("");
      } else {
        // Only show error if user has typed something that looks like an attempt at email
        if (text.includes("@") || text.length > 3) {
          setEmailError("Please enter a valid email address");
        } else {
          setEmailError("");
        }
      }
    } else {
      setEmailError("");
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = identifier.trim();
    
    // Validate email
    if (!trimmedEmail) {
      setEmailError("Please enter your email address");
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setEmailError("");

    const url = API_ENDPOINTS.auth.forgotPassword();
    const body = { email: trimmedEmail };
    if (__DEV__) {
      console.log("[ForgotPassword] forgot-password request:", { url, body });
    }

    setSending(true);
    try {
      const result = await apiClient.request(url, {
        method: "POST",
        body,
        skipAuth: true,
      });
      const data = result.rawBody ?? result.data ?? result;
      console.log("[ForgotPassword] Generate OTP response", {
        ok: result.success,
        status: result.status,
        data,
      });

      if (result.success && (data?.status === "success" || data?.success === true)) {
        const uid = extractUserId(data);
        const userIdNum = uid != null && !Number.isNaN(Number(uid)) ? Number(uid) : null;
        if (userIdNum == null) {
          console.warn("[ForgotPassword] No userId in response. Full response above — backend should return userId when sending OTP.", JSON.stringify(data, null, 2));
        }
        console.log("[ForgotPassword] OTP sent, navigating to ResetPassword", { userId: userIdNum, email: trimmedEmail });
        navigation.replace("ResetPassword", {
          email: trimmedEmail,
          userId: userIdNum,
        });
      } else {
        Alert.alert("Error", result.error || data?.message || "Unable to send verification code.");
      }
    } catch (err) {
      if (__DEV__) console.warn("[ForgotPassword] forgot-password error:", err?.message ?? err);
      const msg = err?.message?.includes("timeout") ? "Request timed out. Please try again." : (err?.message ? `Something went wrong: ${err.message}` : "Something went wrong. Please try again.");
      Alert.alert("Error", msg);
    } finally {
      setSending(false);
    }
  };

  const handleBackToLogin = () => {
    if (navigation && navigation.goBack) {
      navigation.goBack();
    }
  };

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
            <Text style={[styles.title, { fontSize: s24 }]}>Forgot Password?</Text>
            <Text style={[styles.subtitle, { fontSize: s14 }]}>
              No worries! Enter your registered email address,
              and we&apos;ll send you a verification code to reset your
              password.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label={null}
              placeholder="Email Address"
              value={identifier}
              onChangeText={handleEmailChange}
              autoCapitalize="none"
              keyboardType="email-address"
              variant="default"
              size="medium"
              rightIcon={<UserIcon width={18} height={18} />}
              error={emailError}
              editable={!sending}
            />
            <Button
              title="Generate OTP"
              onPress={handleForgotPassword}
              variant="primary"
              size="medium"
              style={styles.submitButton}
              loading={sending}
              disabled={sending || !identifier.trim() || !validateEmail(identifier.trim())}
            />

            <View style={styles.rememberRow}>
              <Text style={[styles.rememberText, { fontSize: s13 }]}>Remember your password?</Text>
              <Pressable onPress={handleBackToLogin} style={styles.backToLoginButton}>
                <Text style={[styles.backToLoginText, { fontSize: s13 }]}>Back to Login</Text>
              </Pressable>
            </View>

            <View style={styles.orSection}>
              <View style={styles.straightLine} />
              <View style={styles.orContainer}>
                <Text style={[styles.orText, { fontSize: sOr }]}>OR</Text>
              </View>
              <Pressable style={styles.otpButton} onPress={() => navigation.navigate("OTPLogin")}>
                <Text style={[styles.otpText, { fontSize: s14 }]}>Get OTP</Text>
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
  submitButton: {
    width: "100%",
  },
  emailSummary: {
    marginBottom: 8,
  },
  emailSummaryLabel: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Regular",
    marginBottom: 4,
  },
  emailSummaryValue: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-SemiBold",
  },
  changeEmailPress: {
    marginTop: 6,
  },
  changeEmailText: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Medium",
  },
  otpWrapper: {
    marginTop: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  otpErrorText: {
    color: "#FF4444",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Manrope-Medium",
  },
  resendWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  resendText: {
    color: COLORS.secondaryColor,
    fontFamily: "Manrope-Medium",
  },
  rememberRow: {
    marginTop: 10,
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
    // marginTop: 90,
    // paddingVertical: 60,
  },
  straightLine: {
    width: "40%",
    backgroundColor: "#e9eaee",
    marginTop: 30,
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
    marginTop: 10,
    alignItems: "center",
  },
  otpText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: "Manrope-Medium",
  },
});
