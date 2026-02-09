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
import UserIcon from "../../assets/icons/user.svg";

const screenHeight = Dimensions.get("window").height;

const proceedToResetPassword = (email, navigation) => {
  navigation.navigate("ResetPassword", { email });
};

const ForgotPassword = ({ navigation }) => {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s24 = getScaledFontSize(24);
  const s14 = getScaledFontSize(14);
  const s13 = getScaledFontSize(13);
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
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (__DEV__) {
        console.log("[ForgotPassword] forgot-password response:", {
          ok: response.ok,
          status: response.status,
          data,
        });
      }

      if (response.ok && (data.status === "success" || data.success)) {
        if (__DEV__) console.log("[ForgotPassword] success, navigating to ResetPassword");
        proceedToResetPassword(trimmedEmail, navigation);
      } else {
        Alert.alert("Error", data.message || "Unable to send verification code.");
      }
    } catch (err) {
      if (__DEV__) console.warn("[ForgotPassword] forgot-password error:", err?.message ?? err);
      Alert.alert(
        "Error",
        err?.message ? `Something went wrong: ${err.message}` : "Something went wrong. Please try again."
      );
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
              title="Send Verification Code"
              onPress={handleForgotPassword}
              variant="primary"
              size="large"
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

            <Pressable
              style={styles.otpButton}
              onPress={() => navigation.navigate("OTPLogin")}
            >
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
    // marginTop: 90,
    // paddingVertical: 60,
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
