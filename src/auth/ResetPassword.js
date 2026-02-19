import React, { useState, useCallback, useRef } from "react";
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
import { COLORS, colors } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import { API_ENDPOINTS } from "../config/apiConfig";
import { extractUserId } from "../utils/extractUserId";
import UserIcon from "../../assets/icons/user.svg";
import EyeBlank from "../../assets/icons/eyeBlank.svg";
import EyeFill from "../../assets/icons/eyeFill.svg";
import TickIcon from "../../assets/icons/Tick Icon.svg";
import CrossIcon from "../../assets/icons/Cross Icon.svg";

const screenHeight = Dimensions.get("window").height;

/**
 * Success screen shown after password is updated — same screen, separate component.
 * Matches the design: logo, "Password Reset Successfully!", message, Back to Login button.
 */
const PasswordResetSuccess = ({ onBackToLogin, isDark, themeColors, getScaledFontSize }) => {
  const s24 = getScaledFontSize(24);
  const s14 = getScaledFontSize(14);
  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#55b56c", "#2a6f65", "#1f3d6d", "#163b7c"]}
        start={{ x: 0.5, y: 1.3 }}
        end={{ x: 0.3, y: 0.5 }}
        style={styles.topGradient}
      />
      <View style={[styles.successContent, isDark && { backgroundColor: themeColors.screen }]}>
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
          <Text style={[styles.successTitle, { fontSize: s24 }]}>Password Reset Successfully!</Text>
          <Text style={[styles.successMessage, { fontSize: s14 }]}>
            Your password has been changed successfully. You can now log in with your new password.
          </Text>
        </View>
        <Button
          title="Back to Login"
          onPress={onBackToLogin}
          variant="primary"
          size="large"
          style={styles.successButton}
        />
      </View>
    </SafeAreaView>
  );
};

const PASSWORD_RULES = [
  { key: "minLength", label: "Minimum 8 characters", test: (p) => p.length >= 8 },
  { key: "number", label: "At least one number", test: (p) => /\d/.test(p) },
  { key: "special", label: "At least one special character (!@#$%^&*)", test: (p) => /[!@#$%^&*]/.test(p) },
  { key: "uppercase", label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
];

const ResetPassword = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s24 = getScaledFontSize(24);
  const s14 = getScaledFontSize(14);
  const s13 = getScaledFontSize(13);
  const s12 = getScaledFontSize(12);
  const sOr = getScaledFontSize(Platform.OS === "ios" ? 14 : 12);
  const params = route.params || {};
  const initialEmail = params.email ?? "";
  const initialUserId = params.userId ?? params.user_id ?? params.uid ?? null;
  const submittedRef = useRef(false);

  const [email, setEmail] = useState(initialEmail || "");
  const [userId, setUserId] = useState(() => {
    if (initialUserId == null) return null;
    const n = Number(initialUserId);
    return Number.isNaN(n) ? null : n;
  });
  const [code, setCode] = useState("");
  const [otpErrorMessage, setOtpErrorMessage] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [passwordUpdatedSuccess, setPasswordUpdatedSuccess] = useState(false);

  const passwordRulesMet = PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(newPassword) }));
  const allRulesMet = passwordRulesMet.every((r) => r.met);
  const passwordsDontMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  useFocusEffect(
    useCallback(() => {
      const p = route.params || {};
      if (p.email) setEmail(p.email);
      const uid = p.userId ?? p.user_id ?? p.uid ?? null;
      if (uid != null) {
        const n = Number(uid);
        if (!Number.isNaN(n)) setUserId(n);
      }
      return () => { submittedRef.current = false; };
    }, [route.params])
  );

  /**
   * Reset Password: get userId if needed, then POST update-password. All response/errors logged to console.
   */
  const handleResetPassword = async () => {
    if (submittedRef.current) return;
    const trimmedEmail = email.trim();
    const otp = String(code).trim().slice(0, 6);

    console.log("[ResetPassword] Reset Password tapped", { email: trimmedEmail, otpLength: otp.length });

    if (!trimmedEmail) {
      console.log("[ResetPassword] Validation error: missing email");
      Alert.alert("Error", "Please enter your email address.");
      return;
    }
    if (!otp || otp.length !== 6) {
      console.log("[ResetPassword] Validation error: OTP not 6 digits");
      Alert.alert("Error", "Please enter the 6-digit code from your email.");
      return;
    }
    if (!newPassword.trim()) {
      console.log("[ResetPassword] Validation error: missing new password");
      Alert.alert("Error", "Please enter a new password.");
      return;
    }
    if (!allRulesMet) {
      console.log("[ResetPassword] Validation error: password rules not met");
      Alert.alert("Error", "Password must meet all requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      console.log("[ResetPassword] Validation error: passwords do not match");
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    submittedRef.current = true;
    setOtpErrorMessage(null);
    setSubmitting(true);

    try {
      if (!userId) {
        console.log("[ResetPassword] userId missing. User must request OTP from Forgot Password first.");
        setSubmitting(false);
        submittedRef.current = false;
        Alert.alert("Error", "User not identified. Please request OTP again from Forgot Password.");
        return;
      }

      const requestBody = {
        userId: Number(userId),
        otp,
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      };
      const updateUrl = API_ENDPOINTS.auth.updatePassword();
      console.log("[ResetPassword] POST update-password. Body:", {
        url: updateUrl,
        userId: requestBody.userId,
        otp: requestBody.otp,
        newPassword: "***",
        confirmPassword: "***",
      });

      const response = await fetch(updateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json().catch((e) => {
        console.log("[ResetPassword] update-password parse error", e?.message || e);
        return {};
      });

      console.log("[ResetPassword] update-password response", {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        data,
      });

      if (response.ok && (data?.status === "success" || data?.success === true)) {
        console.log("[ResetPassword] update-password success");
        setPasswordUpdatedSuccess(true);
        return;
      }

      const errMsg = data.message || data.error || data.msg || "Unable to reset password.";
      const isOtpRelated = /expired|invalid.*otp|otp.*invalid|invalid.*code|code.*expired|verification/i.test(errMsg);
      console.log("[ResetPassword] update-password error", {
        errMsg,
        isOtpRelated,
        data,
      });
      if (isOtpRelated) setOtpErrorMessage(errMsg);
      Alert.alert("Error", errMsg);
    } catch (err) {
      console.log("[ResetPassword] handleResetPassword exception", {
        message: err?.message,
        name: err?.name,
        error: err,
      });
      Alert.alert("Error", err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
      submittedRef.current = false;
    }
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
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && (data?.status === "success" || data?.success === true)) {
        const uid = extractUserId(data);
        if (uid != null && !Number.isNaN(Number(uid))) setUserId(Number(uid));
        Alert.alert("Success", "A new verification code has been sent.");
      } else {
        Alert.alert("Error", data?.message || "Unable to resend code.");
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

  if (passwordUpdatedSuccess) {
    return (
      <PasswordResetSuccess
        onBackToLogin={() => navigation.navigate("Login")}
        isDark={isDark}
        themeColors={themeColors}
        getScaledFontSize={getScaledFontSize}
      />
    );
  }

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
            <Text style={[styles.title, { fontSize: s24 }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { fontSize: s14 }]}>
              Enter your email, the 6-digit code from your email, and your new password. One tap sends the OTP once.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label={null}
              placeholder="Email Address"
              value={email}
              onChangeText={(t) => { setEmail(t); setOtpErrorMessage(null); }}
              autoCapitalize="none"
              keyboardType="email-address"
              variant="default"
              size="medium"
              rightIcon={<UserIcon width={18} height={18} />}
              style={styles.inputContainer}
            />

            <OTPInput
              length={6}
              label={null}
              value={code}
              onChange={(val) => {
                setCode(val);
                setOtpErrorMessage(null);
              }}
              error={otpErrorMessage || undefined}
              errorStyle={[styles.otpErrorText, { fontSize: s12 }]}
              style={styles.otpWrapper}
            />

            <Pressable onPress={handleResendCode} disabled={submitting} style={styles.resendWrap}>
              <Text style={[styles.resendText, { fontSize: s12 }]}>Resend Code</Text>
            </Pressable>

            <Input
              label={null}
              placeholder="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              keyboardType="default"
              variant="default"
              size="medium"
              style={styles.inputContainer}
              hasErrorBorder={passwordsDontMatch}
              rightIcon={
                <Pressable onPress={() => setShowNewPassword((v) => !v)}>
                  <View style={styles.eyeIconContainer}>{showNewPassword ? <EyeFill width={18} height={18} fill={colors.color_text_secondary} /> : <EyeBlank width={18} height={18} fill={colors.color_text_secondary} />}</View>
                </Pressable>
              }
            />
            {newPassword.length > 0 && !allRulesMet && (
              <View style={styles.passwordRulesBox}>
                <Text style={[styles.passwordRulesTitle, { fontSize: s13 }]}>Password must contain:</Text>
                {passwordRulesMet.map((rule) => (
                  <View key={rule.key} style={styles.passwordRuleRow}>
                    <View style={styles.ruleIconWrap}>{rule.met ? <TickIcon width={15} height={15} fill={COLORS.secondaryColor} /> : <CrossIcon width={15} height={15} stroke="#FF4444" />}</View>
                    <Text style={[styles.passwordRuleText, { fontSize: s12 }]}>{rule.label}</Text>
                  </View>
                ))}
              </View>
            )}
            <Input
              label={null}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              keyboardType="default"
              variant="default"
              size="medium"
              style={styles.inputContainer}
              hasErrorBorder={passwordsDontMatch}
              error={passwordsDontMatch ? "Passwords do not match" : undefined}
              errorStyle={[styles.passwordMatchErrorText, { fontSize: s12 }]}
              rightIcon={
                <Pressable onPress={() => setShowConfirmPassword((v) => !v)}>
                  <View style={styles.eyeIconContainer}>{showConfirmPassword ? <EyeFill width={18} height={18} fill={colors.color_text_secondary} /> : <EyeBlank width={18} height={18} fill={colors.color_text_secondary} />}</View>
                </Pressable>
              }
            />

            <Button
              title="Reset Password"
              onPress={handleResetPassword}
              variant="primary"
              size="large"
              style={styles.submitButton}
              loading={submitting}
              disabled={submitting}
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
              <Pressable style={styles.otpButton} onPress={handleGetOTP}>
                <Text style={[styles.otpText, { fontSize: s14 }]}>Get OTP</Text>
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
  successContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 80,
    backgroundColor: "#ffffff",
  },
  successTitle: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Bold",
    textAlign: "center",
    marginTop: 18,
  },
  successMessage: {
    color: COLORS.primaryFontColor,
    fontFamily: "Manrope-Regular",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 16,
  },
  successButton: {
    marginTop: 32,
    width: "100%",
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
  inputContainer: {
    marginBottom: 15,
  },
  passwordMatchErrorText: {
    color: "#FF4444",
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Manrope-Regular",
  },
  passwordRulesBox: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f8f8f8",
  },
  passwordRulesTitle: {
    fontFamily: "Manrope-SemiBold",
    fontSize: 13,
    color: COLORS.primaryFontColor,
    marginBottom: 12,
  },
  passwordRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ruleIconWrap: {
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  passwordRuleText: {
    fontFamily: "Manrope-Regular",
    fontSize: 12,
    color: COLORS.primaryFontColor,
    flex: 1,
  },
  eyeIconContainer: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
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
    marginBottom: 10,
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
