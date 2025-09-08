import { StyleSheet, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState, useEffect } from "react";
import * as Font from "expo-font";

import SplashScreen from "./src/splashScreen/SplashScreen";
import OnBoarding from "./src/screens/OnBoarding";
import Login from "./src/auth/Login";
import Dashboard from "./src/screens/Dashboard";
import Profile from "./src/screens/Profile";
import SideMenu from "./src/screens/SideMenu";
import Usage from "./src/screens/Usage";
import Payments from "./src/screens/Payments";
import Transactions from "./src/screens/Transactions";
import Tickets from "./src/screens/Tickets";
import Settings from "./src/screens/Settings";
import { TabProvider } from "./src/context/TabContext";
import ForgotPassword from "./src/auth/ForgotPassword";
import ResetPassword from "./src/auth/ResetPassword";
import GuestLogin from "./src/auth/GuestLogin";

const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  const loadFonts = async () => {
    await Font.loadAsync({
      "Manrope-Regular": require("./assets/fonts/Manrope-Regular.ttf"),
      "Manrope-Bold": require("./assets/fonts/Manrope-Bold.ttf"),
      "Manrope-SemiBold": require("./assets/fonts/Manrope-SemiBold.ttf"),
      "Manrope-ExtraBold": require("./assets/fonts/Manrope-ExtraBold.ttf"),
      "Manrope-Light": require("./assets/fonts/Manrope-Light.ttf"),
      "Manrope-Medium": require("./assets/fonts/Manrope-Medium.ttf"),
      "Manrope-ExtraLight": require("./assets/fonts/Manrope-ExtraLight.ttf"),
    });
    setFontsLoaded(true);
  };

  const linking = {
    prefixes: ['https://yourapp.com', 'yourapp://'],
    config: {
      screens: {
        ResetPassword: 'reset-password',
      },
    },
  };

  useEffect(() => {
    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <TabProvider>
      <NavigationContainer linking={linking}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="OnBoarding"
            component={OnBoarding}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={Login}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Dashboard"
            component={Dashboard}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Profile"
            component={Profile}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SideMenu"
            component={SideMenu}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Usage"
            component={Usage}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Payments"
            component={Payments}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Transactions"
            component={Transactions}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Tickets"
            component={Tickets}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Settings"
            component={Settings}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPassword}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPassword}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GuestLogin"
            component={GuestLogin}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </TabProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
