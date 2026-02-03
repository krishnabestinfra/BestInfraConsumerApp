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
import { useRoute, useNavigation } from "@react-navigation/native";
import Button from "../components/global/Button";
import Input from "../components/global/Input";
import Logo from "../components/global/Logo";
import { COLORS, colors } from "../constants/colors";
import { API_ENDPOINTS } from "../config/apiConfig";
import EyeBlank from "../../assets/icons/eyeBlank.svg";
import EyeFill from "../../assets/icons/eyeFill.svg";
import TickIcon from "../../assets/icons/Tick Icon.svg";
import CrossIcon from "../../assets/icons/Cross Icon.svg";

const screenHeight = Dimensions.get("window").height;

const PASSWORD_RULES = [
  { key: "minLength", label: "Minimum 8 characters", test: (p) => p.length >= 8 },
  { key: "number", label: "At least one number", test: (p) => /\d/.test(p) },
  { key: "special", label: "At least one special character (!@#$%^&*)", test: (p) => /[!@#$%^&*]/.test(p) },
  { key: "uppercase", label: "At least one uppercase letter", test: (p) => /[A-Z]/.test(p) },
];

const SetNewPassword = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { email, code, userId } = route.params || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordRulesMet = PASSWORD_RULES.map((rule) => ({
    ...rule,
    met: rule.test(newPassword),
  }));
  const allRulesMet = passwordRulesMet.every((r) => r.met);
  const passwordsDontMatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleReset = async () => {
    if (!newPassword.trim()) {
      Alert.alert("Error", "Please enter a new password.");
      return;
    }
    if (!allRulesMet) {
      Alert.alert("Error", "Password must meet all requirements.");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (userId == null || userId === undefined) {
      Alert.alert("Error", "Session expired. Please verify your OTP again.");
      return;
    }

    setSubmitting(true);
    const updatePasswordUrl = API_ENDPOINTS.auth.updatePassword();
    const body = {
      userId: Number(userId),
      otp: code || "",
      newPassword: newPassword.trim(),
      confirmPassword: confirmPassword.trim(),
    };
    if (__DEV__) {
      console.log("[SetNewPassword] update-password request:", { url: updatePasswordUrl, body: { ...body, newPassword: "***", confirmPassword: "***" } });
    }
    try {
      const response = await fetch(updatePasswordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));
      if (__DEV__) {
        console.log("[SetNewPassword] update-password response:", { ok: response.ok, status: response.status, data });
      }

      if (response.ok && (data.status === "success" || data.success)) {
        Alert.alert("Success", "Password reset successful.", [
          { text: "OK", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert("Error", data.message || "Unable to reset password.");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToLogin = () => {
    if (navigation?.navigate) {
      navigation.navigate("Login");
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
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Create a new password below and continue to your account.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Input
              label={null}
              placeholder="Enter new password"
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
                  <View style={styles.eyeIconContainer}>
                    {showNewPassword ? (
                      <EyeFill width={18} height={18} fill={colors.color_text_secondary} />
                    ) : (
                      <EyeBlank width={18} height={18} fill={colors.color_text_secondary} />
                    )}
                  </View>
                </Pressable>
              }
            />

            {newPassword.length > 0 && !allRulesMet && (
              <View style={styles.passwordRulesBox}>
                <Text style={styles.passwordRulesTitle}>Password must contain:</Text>
                {passwordRulesMet.map((rule) => (
                  <View key={rule.key} style={styles.passwordRuleRow}>
                    <View style={styles.ruleIconWrap}>
                      {rule.met ? (
                        <TickIcon width={15} height={15} fill={COLORS.secondaryColor} />
                      ) : (
                        <CrossIcon width={15} height={15} stroke="#FF4444" />
                      )}
                    </View>
                    <Text style={styles.passwordRuleText}>
                      {rule.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Input
              label={null}
              placeholder="Re-enter new password"
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
              errorStyle={styles.passwordMatchErrorText}
              rightIcon={
                <Pressable onPress={() => setShowConfirmPassword((v) => !v)}>
                  <View style={styles.eyeIconContainer}>
                    {showConfirmPassword ? (
                      <EyeFill width={18} height={18} fill={colors.color_text_secondary} />
                    ) : (
                      <EyeBlank width={18} height={18} fill={colors.color_text_secondary} />
                    )}
                  </View>
                </Pressable>
              }
            />

            <Button
              title="Reset Password"
              onPress={handleReset}
              variant="primary"
              size="large"
              style={styles.submitButton}
              loading={submitting}
              disabled={submitting}
            />

            <View style={styles.rememberRow}>
              <Text style={styles.rememberText}>Remember your password?</Text>
              <Pressable onPress={handleBackToLogin} style={styles.backToLoginButton}>
                <Text style={styles.backToLoginText}>Back to Login</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SetNewPassword;

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
  submitButton: {
    marginTop: 12,
    width: "100%",
  },
  rememberRow: {
    marginTop: 20,
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
});
