import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import Button from "../components/global/Button";

const screenHeight = Dimensions.get("window").height;

const GuestLogin = () => {
  const navigation = useNavigation();
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s16 = getScaledFontSize(16);
  const s14 = getScaledFontSize(14);

  const handleContinueAsGuest = () => {
    // Reset navigation stack - removes auth screens from history
    // This ensures pressing back on Dashboard will exit the app
    navigation.reset({
      index: 0,
      routes: [{ name: "PostPaidDashboard", params: { isGuest: true } }],
    });
  };

  return (
    <View style={[styles.Maincontainer, isDark && { backgroundColor: themeColors.screen }]}>
      <View style={[styles.container, isDark && { backgroundColor: themeColors.card }]}>
        <Text style={[styles.description, { fontSize: s16 }]}>
          You are logging in as a guest. Some features may be limited.
        </Text>
        <Button
          title="Continue as Guest"
          onPress={handleContinueAsGuest}
          variant="primary"
          size="large"
          style={styles.button}
        />
        <Button
          title="Already have an account? Login"
          onPress={() => navigation.navigate("Login")}
          variant="ghost"
          size="medium"
          style={styles.link}
          textStyle={[styles.linkText, { fontSize: s14 }]}
        />
      </View>
    </View>
  );
};

export default GuestLogin;

const styles = StyleSheet.create({
  Maincontainer: {
    height: "100%",
    justifyContent: "center",
  },
  container: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: "center",
  },
  description: {
    fontSize: 16,
    color: "#444",
    marginBottom: 30,
    textAlign: "center",
  },
  button: {
    marginBottom: 15,
    width: "100%",
  },
  link: {
    marginTop: 10,
  },
  linkText: {
    color: "#1f3d6d",
    fontSize: 14,
    fontWeight: "500",
  },
});
