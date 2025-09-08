import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Button from "../components/global/Button";

const screenHeight = Dimensions.get("window").height;

const GuestLogin = () => {
  const navigation = useNavigation();

  const handleContinueAsGuest = () => {
    // Navigate to home or dashboard (replace 'Home' with your actual screen)
    navigation.navigate("Dashboard", { isGuest: true });
  };

  return (
    <View style={styles.Maincontainer}>
      <View style={styles.container}>
        <Text style={styles.description}>
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
          textStyle={styles.linkText}
        />
      </View>
    </View>
  );
};

export default GuestLogin;

const styles = StyleSheet.create({
  Maincontainer: {
    height: "100%",
    display: "flex",
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
