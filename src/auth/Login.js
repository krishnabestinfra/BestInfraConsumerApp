import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  Alert,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../context/ThemeContext";
import LoginForm from "./LoginForm";
import { storeUser, extractConsumerInfo } from "../utils/storage";
import { testConsumerCredentials } from "../services/apiService";
import { API, API_ENDPOINTS } from "../constants/constants";
import { authService } from "../services/authService";
import Button from "../components/global/Button";
import Logo from "../components/global/Logo";
import EmailLogin from "./EmailLogin";
import MobileLogin from "./MobileLogin";

const screenHeight = Dimensions.get("window").height;

// Blue/gradient behind the logo – same in light and dark theme (brand).
const LOGIN_HEADER_GRADIENT = ["#55b56c", "#2a6f65", "#1f3d6d", "#163b7c"];
// Logo circle gradient – same in light and dark theme (brand blue-to-green).
const LOGO_CIRCLE_GRADIENT = ["#163b7c", "#1f3d6d", "#2a6f65", "#55b56c"];

const Login = ({ navigation }) => {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s24 = getScaledFontSize(24);
  const s14 = getScaledFontSize(14);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleLogin = async () => {
    // Clear any previous error message when starting a new login attempt
    setLoginError("");
    setIsLoading(true);
    
    try {
      // Validate input
      if (!identifier.trim() || !password.trim()) {
        setLoginError("Invalid credentials. Please check your email/phone and password.");
        return;
      }

      // DEMO MODE: Check for dummy credentials first
      const dummyCredentials = {
        "demo": "demo123",
        "test": "test123", 
        "admin": "admin123",
        "user": "user123",
        "BI25GMRA001": "demo123",
        "BI25GMRA002": "demo123",
        "BI25GMRA003": "demo123",
        "BI25GMRA004": "demo123",
        "BI25GMRA005": "demo123",
        "BI25GMRA006": "demo123",
        "BI25GMRA007": "demo123",
        "BI25GMRA008": "demo123",
        "BI25GMRA009": "demo123",
        "BI25GMRA010": "demo123",
        "BI25GMRA011": "demo123",
        "BI25GMRA012": "demo123",
        "BI25GMRA013": "demo123",
        "BI25GMRA014": "demo123",
        "BI25GMRA015": "demo123",
        "BI25GMRA016": "demo123",
        "BI25GMRA017": "demo123",
        "BI25GMRA018": "demo123",
        "BI25GMRA019": "demo123",
        "BI25GMRA020": "demo123"
      };

      // Check if it's a dummy login
      if (dummyCredentials[identifier.trim()] && password.trim() === dummyCredentials[identifier.trim()]) {
        console.log("🎭 DEMO MODE: Using dummy credentials for", identifier);
        
        // Create dummy user data for demo
        const dummyUserData = {
          name: identifier === "demo" ? "Demo User" : 
                identifier === "test" ? "Test User" :
                identifier === "admin" ? "Admin User" :
                identifier === "user" ? "Regular User" :
                `Consumer ${identifier}`,
          identifier: identifier.trim(),
          email: `${identifier}@demo.com`,
          consumerNumber: identifier.trim(),
          meterSerialNumber: "DEMO-METER-001",
          uniqueIdentificationNo: identifier.trim(),
          totalOutstanding: 1500.00
        };

        // Store dummy user data
        await storeUser(dummyUserData);
        // Store demo access token using auth service
        await authService.storeAccessToken("demo-token-" + Date.now());
        // Store remember me preference
        await authService.setRememberMe(checked);

        console.log("✅ DEMO LOGIN SUCCESSFUL:", dummyUserData);
        
        Alert.alert(
          "Demo Login Successful",
          `Welcome ${dummyUserData.name}! You are now logged in with demo credentials.`,
          [
            {
              text: "Continue",
              onPress: () => {
                // Reset navigation stack - removes Login from history
                navigation.reset({
                  index: 0,
                  routes: [{ name: "PostPaidDashboard" }],
                });
              }
            }
          ]
        );
        return;
      }

      // Show loading state
      console.log("🔄 Attempting login for consumer:", identifier);
      console.log("🔍 Login endpoint:", API_ENDPOINTS.auth.login());
      console.log("🔍 Request payload:", {
        identifier: identifier.trim(),
        password: password.trim()
      });
      
      // NOTE: If you're getting 401 errors for other consumers, it means they don't have 
      // valid credentials in the authentication system. Only BI25GMRA017 appears to be configured.
      // You may need to:
      // 1. Add other consumers to the authentication database
      // 2. Use a different authentication endpoint
      // 3. Configure the API to accept all consumer identifiers with a common password
      
      // Optional: Test credentials first (skip if network error - actual login will validate)
      // This is just a pre-check, not required for login to proceed
      try {
        const credentialTest = await testConsumerCredentials(identifier, password);
        console.log("🔍 Credential test result:", credentialTest);
        
        // Only fail if we got a clear authentication error (401/403), not network errors
        if (credentialTest.hasValidCredentials === false && 
            credentialTest.status !== 0 && 
            (credentialTest.status === 401 || credentialTest.status === 403)) {
          throw new Error(`Consumer ${identifier} does not have valid credentials in the authentication system. Please contact support to add this consumer to the system.`);
        }
        // If network error (status 0), continue anyway - actual login will handle it
      } catch (testError) {
        // If credential test fails with network error, continue to actual login
        // The actual login call will handle validation properly
        if (testError.message && !testError.message.includes('does not have valid credentials')) {
          console.warn("⚠️ Credential test failed, but proceeding with login:", testError.message);
        } else {
          // Re-throw if it's a validation error (not network error)
          throw testError;
        }
      }

      // Make API call to login endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(API_ENDPOINTS.auth.login(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password.trim()
        }),
        signal: controller.signal
      });

      console.log("🔍 API Response Status:", response.status);
      console.log("🔍 API Response Headers:", response.headers);

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to get error details from response
        let errorDetails = '';
        try {
          const errorResponse = await response.json();
          errorDetails = errorResponse.message || errorResponse.error || '';
          console.log("❌ API Error Response:", errorResponse);
        } catch (e) {
          console.log("❌ Could not parse error response");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
      }

      const result = await response.json();
      console.log("✅ Login response:", result);

      // Check if login was successful
      if (result.success && result.data) {
        // Handle tokens using authService
        const tokens = await authService.handleLoginResponse(response, result);
        
        if (!tokens.accessToken) {
          throw new Error("No access token received from server");
        }
        
        // Extract consumer information using helper function
        const consumerInfo = extractConsumerInfo(result, identifier);
        
        const userData = {
          name: consumerInfo.name, // Store the actual consumer name
          email: consumerInfo.email,
          uid: consumerInfo.identifier,
          identifier: consumerInfo.identifier,
          consumerName: consumerInfo.name, // Explicitly store consumer name
          consumerNumber: consumerInfo.consumerNumber,
          meterSerialNumber: consumerInfo.meterSerialNumber,
          meterId: consumerInfo.meterId, // Store meterId from login (for consumers 1-19)
          uniqueIdentificationNo: consumerInfo.uniqueIdentificationNo,
          accessToken: tokens.accessToken // Store access token reference
        };
        
        await storeUser(userData);
        // Store remember me preference
        await authService.setRememberMe(checked);
        
        console.log("✅ User data stored successfully:", {
          name: consumerInfo.name,
          identifier: consumerInfo.identifier,
          consumerNumber: consumerInfo.consumerNumber,
          meterId: consumerInfo.meterId, // Log meterId from login
          meterSerialNumber: consumerInfo.meterSerialNumber
        });
        
        // Log meterId specifically for LS data API
        if (consumerInfo.meterId) {
          console.log("🔢 MeterId stored for LS data API:", consumerInfo.meterId);
        } else {
          console.warn("⚠️ MeterId not found in login response. LS data API may not work.");
        }
        
        // Register push notification token after successful login
        try {
          const { getPushToken, registerPushToken } = await import('../services/pushNotificationService');
          const pushToken = await getPushToken();
          if (pushToken) {
            await registerPushToken(pushToken);
            console.log("✅ Push notification token registered");
          }
        } catch (pushError) {
          console.warn("⚠️ Failed to register push token:", pushError);
          // Don't block login if push registration fails
        }
        
        // Reset navigation stack - removes Login from history
        // This ensures pressing back on Dashboard will exit the app, not go to Login
        navigation.reset({
          index: 0,
          routes: [{ name: "PostPaidDashboard" }],
        });
      } else {
        throw new Error(result.message || "Invalid response from server");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      
      let errorMessage = "An unexpected error occurred. Please try again.";
      
      if (error.name === 'AbortError') {
        errorMessage = "Request timed out. Please check your connection and try again.";
      } else if (error.message.includes('Network')) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (error.message.includes('HTTP 401')) {
        // Match exact UI copy for invalid credentials
        errorMessage = "Invalid credentials. Please check your email/phone and password.";
      } else if (error.message.includes('HTTP 403')) {
        errorMessage = "Access denied. This consumer may not have permission to access the system.";
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = "Consumer not found. Please verify your identifier is correct.";
      } else if (error.message.includes('HTTP')) {
        errorMessage = `Server error (${error.message}). Please try again later.`;
      } else if (error.message) {
        // Map internal validation error about missing credentials in auth system
        // to the same friendly invalid-credentials text shown in the UI
        if (error.message.includes('does not have valid credentials')) {
          errorMessage = "Invalid credentials. Please check your email/phone and password.";
        } else {
          errorMessage = error.message;
        }
      }

      // Show inline error message under the inputs instead of an alert
      setLoginError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={styles.loginScreenContent}>
        <LinearGradient
          colors={LOGIN_HEADER_GRADIENT}
          start={{ x: 0.5, y: 1.3 }}
          end={{ x: 0.3, y: 0.5 }}
          style={[styles.loginHeaderGradient, { height: screenHeight * 0.2 }]}
        />
        <View style={styles.loginScrollWrapper}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <View
              style={[
                styles.subContainer,
                isDark && { backgroundColor: "transparent" },
              ]}
            >
            <View style={styles.imageContainer}>
              <LinearGradient
                colors={LOGO_CIRCLE_GRADIENT}
                start={{ x: 0.5, y: 1 }}
                end={{ x: 1.2, y: 0.2 }}
                style={styles.gradientBackground}
              >
                <Logo variant="white" size="large" />
              </LinearGradient>
            </View>

            <View style={styles.TextContainer}>
              <Text style={[styles.welcomeText, { fontSize: s24, color: themeColors.textPrimary }]}>Welcome</Text>
              <Text style={[styles.bestinfraText, { fontSize: s24, color: themeColors.textPrimary }]}>to Best Infra</Text>
            </View>
            <View style={styles.TextContainer}>
              <Text style={[styles.LoginText, { fontSize: s14, color: themeColors.textSecondary }]}>
              Access your smart meter data, monitor energy usage, and manage everything seamlessly — all within one secure platform.
              </Text>
            </View>
            <LoginForm
              email={identifier}
              password={password}
              checked={checked}
              setEmail={setIdentifier}
              setPassword={setPassword}
              setChecked={setChecked}
              handleLogin={handleLogin}
              navigation={navigation}
              isLoading={isLoading}
              loginError={loginError}
              setLoginError={setLoginError}
            />
            
            {/* Demo Credentials Display */}
            {/* <View style={styles.demoContainer}>
              <Text style={styles.demoTitle}>🎭 Demo Credentials</Text>
              <Text style={styles.demoText}>For testing purposes, you can use:</Text>
              <Text style={styles.demoCredential}>Username: demo | Password: demo123</Text>
              <Text style={styles.demoCredential}>Username: test | Password: test123</Text>
              <Text style={styles.demoCredential}>Username: BI25GMRA001 | Password: demo123</Text>
              <Text style={styles.demoNote}>Or any BI25GMRA001-BI25GMRA020 with password: demo123</Text>
            </View> */}
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

            </View>
          </KeyboardAvoidingView>  
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loginScreenContent: {
    flex: 1,
  },
  loginHeaderGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: "100%",
    zIndex: 1,
  },
  loginScrollWrapper: {
    flex: 1,
    zIndex: 2,
  },
  keyboardView: {
    flex: 1,
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
        shadowColor: "#262626",
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
    marginTop: 18,
  },
  welcomeText: {
    fontSize: 24,
    fontFamily: "Manrope-Bold",
  },
  bestinfraText: {
    fontSize: 24,
    fontFamily: "Manrope-Bold",
  },
  LoginText: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Manrope-Regular",
  },
  demoContainer: {
    backgroundColor: "#f8f9fa",
    marginHorizontal: 20,
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  demoTitle: {
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  demoText: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    textAlign: "center",
    marginBottom: 8,
  },
  demoCredential: {
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    textAlign: "center",
    marginBottom: 4,
  },
  demoNote: {
    fontSize: 10,
    fontFamily: "Manrope-Regular",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  allText: {
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
    marginTop: -20,
  },
  straightLine: {
    width: "40%",
    backgroundColor: "#e9eaee",
    marginTop: 40,
    height: 2,
    alignSelf: "center",
  },
  orText: {
    fontSize: Platform.OS === "ios" ? 14 : 12,
    textAlign: "center",
    fontFamily: "Manrope-SemiBold",
  },
  guestContainer: {
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
    fontSize: 16,
    fontFamily: "Manrope-Medium",
  },
});
