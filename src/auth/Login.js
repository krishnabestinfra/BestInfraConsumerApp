import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  SafeAreaView,
  Alert,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import LoginForm from "./LoginForm";
import { storeUser, storeToken, extractConsumerInfo } from "../utils/storage";
import { testConsumerCredentials } from "../services/apiService";
import { GLOBAL_API_URL } from "../constants/constants";
import Button from "../components/global/Button";
import Logo from "../components/global/Logo";
import EmailLogin from "./EmailLogin";
import MobileLogin from "./MobileLogin";

const screenHeight = Dimensions.get("window").height;

const Login = ({ navigation }) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [checked, setChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Validate input
      if (!identifier.trim() || !password.trim()) {
        Alert.alert(
          "Validation Error",
          "Please enter both identifier and password.",
          [{ text: "OK" }]
        );
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
        await storeToken("demo-token-" + Date.now());

        console.log("✅ DEMO LOGIN SUCCESSFUL:", dummyUserData);
        
        Alert.alert(
          "Demo Login Successful",
          `Welcome ${dummyUserData.name}! You are now logged in with demo credentials.`,
          [
            {
              text: "Continue",
              onPress: () => navigation.replace("Dashboard")
            }
          ]
        );
        return;
      }

      // Show loading state
      console.log("🔄 Attempting login for consumer:", identifier);
      console.log("🔍 Login endpoint:", `http://${GLOBAL_API_URL}:4256/api/sub-app/auth/login`);
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
      
      // First, let's test if this consumer has valid credentials
      const credentialTest = await testConsumerCredentials(identifier, password);
      console.log("🔍 Credential test result:", credentialTest);
      
      if (!credentialTest.hasValidCredentials) {
        throw new Error(`Consumer ${identifier} does not have valid credentials in the authentication system. Please contact support to add this consumer to the system.`);
      }

      // Make API call to login endpoint with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`http://${GLOBAL_API_URL}:4256/api/sub-app/auth/login`, {
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

      if (result.success && result.data && result.data.token) {
        // Store token and user data
        await storeToken(result.data.token);
        
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
          uniqueIdentificationNo: consumerInfo.uniqueIdentificationNo,
          token: result.data.token
        };
        
        await storeUser(userData);
        console.log("✅ User data stored successfully:", {
          name: consumerInfo.name,
          identifier: consumerInfo.identifier,
          consumerNumber: consumerInfo.consumerNumber
        });
        
        // Navigate to PostPaidDashboard
        navigation.navigate("PostPaidDashboard");
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
        errorMessage = "Invalid credentials. Please check your identifier and password, or contact support if this consumer should have access.";
      } else if (error.message.includes('HTTP 403')) {
        errorMessage = "Access denied. This consumer may not have permission to access the system.";
      } else if (error.message.includes('HTTP 404')) {
        errorMessage = "Consumer not found. Please verify your identifier is correct.";
      } else if (error.message.includes('HTTP')) {
        errorMessage = `Server error (${error.message}). Please try again later.`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        "Login Failed",
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#55b56c", "#2a6f65", "#1f3d6d", "#163b7c"]}
        start={{ x: 0.5, y: 1.3 }}
        end={{ x: 0.3, y: 0.5 }}
        style={{
          height: screenHeight * 0.2,
          width: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
        }}
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

            <View style={styles.TextContainer}>
              <Text style={styles.welcomeText}>Welcome</Text>
              <Text style={styles.bestinfraText}>to Best Infra</Text>
            </View>
            <View style={styles.TextContainer}>
              <Text style={styles.LoginText}>
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

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
  subContainer: {
    padding: 30,
  },
  TextContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  welcomeText: {
    color: COLORS.primaryFontColor,
    fontSize: 24,
    fontFamily: "Manrope-Bold",
  },
  bestinfraText: {
    color: COLORS.primaryFontColor,
    fontSize: 24,
    fontFamily: "Manrope-Bold",
  },
  LoginText: {
    color: COLORS.primaryFontColor,
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
    color: COLORS.primaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    textAlign: "center",
    marginBottom: 8,
  },
  demoText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    textAlign: "center",
    marginBottom: 8,
  },
  demoCredential: {
    color: COLORS.primaryColor,
    fontSize: 12,
    fontFamily: "Manrope-Medium",
    textAlign: "center",
    marginBottom: 4,
  },
  demoNote: {
    color: COLORS.color_text_secondary,
    fontSize: 10,
    fontFamily: "Manrope-Regular",
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  allText: {
    color: COLORS.primaryFontColor,
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
    marginTop: -18,
  },
  straightLine: {
    width: "40%",
    backgroundColor: "#e9eaee",
    marginTop: 40,
    height: 2,
    alignSelf: "center",
  },
  orText: {
    color: COLORS.primaryFontColor,
    fontSize: Platform.OS === "ios" ? 14 : 12,
    textAlign: "center",
    verticalAlign: "middle",
    fontFamily: "Manrope-SemiBold",
  },
  guestContainer: {
    display: "flex",
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
    color: COLORS.primaryFontColor,
    fontSize: 16,
    fontFamily: "Manrope-Medium",
  },
});
