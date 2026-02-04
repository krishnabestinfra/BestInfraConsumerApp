import { StyleSheet, View, ActivityIndicator, BackHandler, ToastAndroid, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState, useEffect, useRef } from "react";
import * as Font from "expo-font";
import { checkForAppUpdates } from "./src/utils/updateChecker";
import Toast from 'react-native-toast-message';
import Logo from "./src/components/global/Logo";
import { COLORS } from "./src/constants/colors";
import PushNotificationHandler from "./src/components/global/PushNotificationHandler";
import { initializePushNotifications } from "./src/services/pushNotificationService";

import SplashScreen from "./src/splashScreen/SplashScreen";
import OnBoarding from "./src/screens/OnBoarding";
import Login from "./src/auth/Login";
import Dashboard from "./src/screens/Dashboard";
import Profile from "./src/screens/Profile";
import ProfileScreenMain from "./src/screens/ProfileScreenMain";
import SideMenu from "./src/screens/SideMenu";
import Usage from "./src/screens/Usage";
import Payments from "./src/screens/Payments";
import Transactions from "./src/screens/Transactions";
import Tickets from "./src/screens/Tickets";
import Settings from "./src/screens/Settings";
import { TabProvider } from "./src/context/TabContext";
import { AppProvider } from "./src/context/AppContext";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { NavigationProvider } from "./src/context/NavigationContext";
import { DataProvider } from "./src/context/DataContext";
import ForgotPassword from "./src/auth/ForgotPassword";
import OTPLogin from "./src/auth/OTPLogin";
import ResetPassword from "./src/auth/ResetPassword";
import SetNewPassword from "./src/auth/SetNewPassword";
import GuestLogin from "./src/auth/GuestLogin";
import TicketDetails from "./src/screens/TicketDetails";
import ChatSupport from "./src/screens/ChatSupport";
import PostPaidDashboard from "./src/screens/PostPaidDashboard";
import PostPaidRechargePayments from "./src/screens/PostPaidRechargePayments";
import PaymentStatus from "./src/screens/PaymentStatus";
import DgScreen from "./src/screens/DgScreen";
import ConsumerDataTable from "./src/screens/ConsumerDataTable";
import Invoices from "./src/screens/Invoices";
import Reports from "./src/screens/Reports";
import Toastify from 'react-native-toast-message';


const Stack = createNativeStackNavigator();

export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const navigationRef = useRef(null);
  const lastBackPressTime = useRef(0);

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

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Toast.show({
        type: 'info',
        text1: message,
        position: 'bottom',
        visibilityTime: 2000,
      });
    }
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
    // Check for app updates after fonts are loaded
    checkForAppUpdates();
    
    // Initialize push notifications
    const initPushNotifications = async () => {
      try {
        // Initialize push notifications (token registration happens after login)
        await initializePushNotifications();
        console.log('✅ Push notifications initialized');
      } catch (error) {
        console.error('❌ Error initializing push notifications:', error);
      }
    };
    
    initPushNotifications();
  }, []);

  // Global Back Button Handler
  useEffect(() => {
    const handleBackPress = () => {
      // Check if navigation is ready
      if (!navigationRef.current) {
        return false;
      }

      const currentRoute = navigationRef.current.getCurrentRoute();
      const routeName = currentRoute?.name;

      console.log('Back button pressed on:', routeName);

      // Define auth screens - allow default back behavior
      const authScreens = ['Splash', 'OnBoarding', 'Login', 'ForgotPassword', 'OTPLogin', 'ResetPassword', 'SetNewPassword', 'GuestLogin'];
      
      if (authScreens.includes(routeName)) {
        // Allow default back behavior on auth screens
        return false;
      }

      // Define dashboard screens
      const dashboardScreens = ['PostPaidDashboard', 'Dashboard'];
      
      if (dashboardScreens.includes(routeName)) {
        // On Dashboard - press back to exit
        const now = Date.now();
        const DOUBLE_PRESS_DELAY = 2000; // 2 seconds

        if (now - lastBackPressTime.current < DOUBLE_PRESS_DELAY) {
          // Second press - exit app
          BackHandler.exitApp();
          return true;
        } else {
          // First press - show toast
          lastBackPressTime.current = now;
          showToast('Press back again to exit');
          return true;
        }
      }

      // From any other screen - navigate to Dashboard
      try {
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'PostPaidDashboard' }],
        });
        showToast('Returned to Dashboard');
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback navigation
        navigationRef.current.navigate('PostPaidDashboard');
      }

      return true; // Prevent default back behavior
    };

    // Add back button event listener
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    // Cleanup on unmount
    return () => backHandler.remove();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={styles.container}>
        <Logo variant="white" size="large" />
        <ActivityIndicator size="large" color={COLORS.secondaryFontColor} style={styles.loader} />
      </View>
    );
  }

  return (
    <AppProvider>
      <DataProvider>
        <NavigationProvider>
          <NotificationsProvider>
            <TabProvider>
              <NavigationContainer ref={navigationRef} linking={linking}> 
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
            name="ProfileScreenMain"
            component={ProfileScreenMain}
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
            name="OTPLogin"
            component={OTPLogin}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPassword}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SetNewPassword"
            component={SetNewPassword}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="GuestLogin"
            component={GuestLogin}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TicketDetails"
            component={TicketDetails}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChatSupport"
            component={ChatSupport}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PostPaidDashboard"
            component={PostPaidDashboard}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PostPaidRechargePayments"
            component={PostPaidRechargePayments}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PaymentStatus"
            component={PaymentStatus}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="DG"
            component={DgScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ConsumerDataTable"
            component={ConsumerDataTable}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Invoices"
            component={Invoices}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Reports"
            component={Reports}
            options={{ headerShown: false }}
          />
            </Stack.Navigator>
             <Toastify />
             <PushNotificationHandler />
              </NavigationContainer>
            </TabProvider>
          </NotificationsProvider>
        </NavigationProvider>
      </DataProvider>
    </AppProvider>
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
