import { StyleSheet, View, BackHandler, ToastAndroid, Platform, AppState } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React, { useState, useEffect, useRef, Suspense } from "react";
import * as Font from "expo-font";
import { checkForAppUpdates } from "./src/utils/updateChecker";
import Toast from 'react-native-toast-message';
import Logo from "./src/components/global/Logo";
import { COLORS } from "./src/constants/colors";
import PushNotificationHandler from "./src/components/global/PushNotificationHandler";
import { initializePushNotifications, checkAndShowPushChannelNotifications } from "./src/services/pushNotificationService";
import { isRunningInExpoGo } from "./src/utils/expoGoDetect";

// ── Critical path screens (loaded eagerly — Splash → Auth → Dashboard) ──
import SplashScreen from "./src/splashScreen/SplashScreen";
import OnBoarding from "./src/screens/OnBoarding";
import Login from "./src/auth/Login";
import OTPLogin from "./src/auth/OTPLogin";
import PostPaidDashboard from "./src/screens/dashboard/PostPaidDashboard";
// ── Eager: high-traffic screens for instant navigation (~50–100ms faster) ──
import Invoices from "./src/screens/invoices/Invoices";
import Usage from "./src/screens/usage/Usage";
import SideMenu from "./src/screens/account/SideMenu";
import Profile from "./src/screens/account/Profile";
import Payments from "./src/screens/recharge/Payments";
import Reports from "./src/screens/invoices/Reports";
import Tickets from "./src/screens/tickets/Tickets";

import { TabProvider } from "./src/context/TabContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AppProvider } from "./src/context/AppContext";
import { NotificationsProvider } from "./src/context/NotificationsContext";
import { NavigationProvider } from "./src/context/NavigationContext";
import { DataProvider } from "./src/context/DataContext";
import { ConsumerProvider } from "./src/context/ConsumerContext";
import Toastify from 'react-native-toast-message';
import ErrorBoundary from "./src/components/global/ErrorBoundary";
import { withScreenErrorBoundary } from "./src/components/global/withScreenErrorBoundary";
import { initializeMonitoring } from "./src/config/monitoring";
import { reportColdStart } from "./src/utils/performanceMonitor";
import NavigationBarController from "./src/core/system/NavigationBarController";

// ── Lazy-loaded screens: no fallback; Stack contentStyle provides background during load ──
function lazyScreen(importFn) {
  const Lazy = React.lazy(importFn);
  return function LazyWrapper(props) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

const ForgotPassword = lazyScreen(() => import("./src/auth/ForgotPassword"));
const ResetPassword = lazyScreen(() => import("./src/auth/ResetPassword"));
const GuestLogin = lazyScreen(() => import("./src/auth/GuestLogin"));
const Notifications = lazyScreen(() => import("./src/screens/account/Notifications"));
const Settings = lazyScreen(() => import("./src/screens/account/Settings"));
const PostPaidRechargePayments = lazyScreen(() => import("./src/screens/recharge/PostPaidRechargePayments"));
const PaymentStatus = lazyScreen(() => import("./src/screens/recharge/PaymentStatus"));
const Transactions = lazyScreen(() => import("./src/screens/invoices/Transactions"));
const TicketDetails = lazyScreen(() => import("./src/screens/tickets/TicketDetails"));
const ChatSupport = lazyScreen(() => import("./src/screens/tickets/ChatSupport"));
const LsDataTable = lazyScreen(() => import("./src/screens/dashboard/LsDataTable"));
const TermsOfServicesScreen = lazyScreen(() => import("./src/screens/account/TermsOfServicesScreen"));
const PrivacyPolicyScreen = lazyScreen(() => import("./src/screens/account/PrivacyPolicyScreen"));

const Stack = createNativeStackNavigator();

function AppNavigator({ navigationRef, linking }) {
  const { isDark, colors } = useTheme();
  const screenBg = colors?.screenSecondary || colors?.screen || "#eef8f0";
  const navTheme = {
    ...DefaultTheme,
    dark: isDark,
    colors: {
      ...DefaultTheme.colors,
      primary: colors?.accent || COLORS.primaryColor,
      background: screenBg,
      card: screenBg,
      text: colors?.textPrimary || COLORS.primaryFontColor,
      border: colors?.cardBorder || "#E5E7EB",
      notification: colors?.accent || COLORS.primaryColor,
    },
  };
  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: screenBg },
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <Stack.Screen name="OnBoarding" component={OnBoarding} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
        <Stack.Screen name="Notifications" component={withScreenErrorBoundary(Notifications)} options={{ headerShown: false }} />
        <Stack.Screen name="Profile" component={Profile} options={{ headerShown: false }} />
        <Stack.Screen name="SideMenu" component={SideMenu} options={{ headerShown: false }} />
        <Stack.Screen name="Usage" component={Usage} options={{ headerShown: false }} />
        <Stack.Screen name="Payments" component={Payments} options={{ headerShown: false }} />
        <Stack.Screen name="Transactions" component={withScreenErrorBoundary(Transactions)} options={{ headerShown: false }} />
        <Stack.Screen name="Tickets" component={withScreenErrorBoundary(Tickets)} options={{ headerShown: false }} />
        <Stack.Screen name="Settings" component={Settings} options={{ headerShown: false }} />
        <Stack.Screen name="ForgotPassword" component={ForgotPassword} options={{ headerShown: false }} />
        <Stack.Screen name="OTPLogin" component={OTPLogin} options={{ headerShown: false }} />
        <Stack.Screen name="ResetPassword" component={ResetPassword} options={{ headerShown: false }} />
        <Stack.Screen name="GuestLogin" component={GuestLogin} options={{ headerShown: false }} />
        <Stack.Screen name="TicketDetails" component={withScreenErrorBoundary(TicketDetails)} options={{ headerShown: false }} />
        <Stack.Screen name="ChatSupport" component={withScreenErrorBoundary(ChatSupport)} options={{ headerShown: false }} />
        <Stack.Screen name="PostPaidDashboard" component={withScreenErrorBoundary(PostPaidDashboard)} options={{ headerShown: false }} />
        <Stack.Screen name="PostPaidRechargePayments" component={PostPaidRechargePayments} options={{ headerShown: false }} />
        <Stack.Screen name="PaymentStatus" component={PaymentStatus} options={{ headerShown: false }} />
        <Stack.Screen name="LsDataTable" component={LsDataTable} options={{ headerShown: false }} />
        <Stack.Screen name="Invoices" component={withScreenErrorBoundary(Invoices)} options={{ headerShown: false }} />
        <Stack.Screen name="Reports" component={withScreenErrorBoundary(Reports)} options={{ headerShown: false }} />
        <Stack.Screen name="TermsOfServices" component={TermsOfServicesScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
      <Toastify />
      <PushNotificationHandler />
    </NavigationContainer>
  );
}

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
    reportColdStart();
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

  // Prefetch remaining lazy screens immediately (0ms = ~50–100ms head start)
  useEffect(() => {
    const prefetch = () => {
      import("./src/screens/invoices/Transactions");
      import("./src/screens/recharge/PostPaidRechargePayments");
      import("./src/screens/recharge/PaymentStatus");
      import("./src/screens/tickets/TicketDetails");
      import("./src/screens/tickets/ChatSupport");
      import("./src/screens/dashboard/LsDataTable");
      import("./src/screens/account/Settings");
      import("./src/screens/account/Notifications");
      import("./src/auth/ForgotPassword");
      import("./src/auth/ResetPassword");
      import("./src/auth/GuestLogin");
      import("./src/screens/account/TermsOfServicesScreen");
      import("./src/screens/account/PrivacyPolicyScreen");
    };
    prefetch();
    return () => {};
  }, []);

  useEffect(() => {
    loadFonts();
    initializeMonitoring();
    // Defer non-critical work to keep startup ~50–100ms faster
    setTimeout(() => checkForAppUpdates(), 1500);
    setTimeout(() => {
      if (isRunningInExpoGo()) return;
      initializePushNotifications().then(() => console.log('✅ Push notifications initialized')).catch(() => {});
    }, 800);
  }, []);

  // Poll for PUSH-channel notifications from API (backend sends data only; we show as push).
  // Delay initial run so app can show Splash/Dashboard first; avoid fetching before user is ready.
  useEffect(() => {
    const runCheck = () => checkAndShowPushChannelNotifications().catch(() => {});
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') runCheck();
    });
    const interval = setInterval(runCheck, 2 * 60 * 1000);
    const initialDelay = setTimeout(runCheck, 5000);
    return () => {
      subscription?.remove?.();
      clearInterval(interval);
      clearTimeout(initialDelay);
    };
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
      const authScreens = ['Splash', 'OnBoarding', 'Login', 'ForgotPassword', 'OTPLogin', 'ResetPassword', 'GuestLogin'];
      
      if (authScreens.includes(routeName)) {
        // Allow default back behavior on auth screens
        return false;
      }

      // Define dashboard screens
      const dashboardScreens = ['PostPaidDashboard'];
      
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

  // Don't block first paint on fonts: show app immediately (system fonts), then re-render when fonts load for smoother UX.
  return (
    <ErrorBoundary>
      <ThemeProvider>
      <NavigationBarController />
        <AppProvider>
          <DataProvider>
          <ConsumerProvider>
          <NavigationProvider>
            <NotificationsProvider>
              <TabProvider>
                <AppNavigator navigationRef={navigationRef} linking={linking} />
              </TabProvider>
            </NotificationsProvider>
          </NavigationProvider>
          </ConsumerProvider>
          </DataProvider>
        </AppProvider>
      </ThemeProvider>
    </ErrorBoundary>
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
