import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import AppFlatList from "../../components/global/AppFlatList";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Menu from "../../../assets/icons/bars.svg";
import Notification from "../../../assets/icons/notificationsWhite.svg";
import NotificationIcon from "../../../assets/icons/notificationDark.svg";
import BiLogo from "../../../assets/icons/LogoWhite.svg";
import HandBill from "../../../assets/icons/handBill.svg";
import Calendar from "../../../assets/icons/calendar.svg";
import CheapDollar from "../../../assets/icons/cheapDollar.svg";
import NotificationCard from "../../components/global/NotificationCard";
import Logo from "../../components/global/Logo";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import { useApp } from "../../context/AppContext";
import { useNotifications } from "../../context/NotificationsContext";
import { getUser } from "../../utils/storage";

/**
 * Resolve the logged-in consumer ID from all possible sources.
 * Covers: identifier, consumerNumber, uid (auth may store any of these).
 */
const getLoggedInConsumerId = (user, consumerData, routeUid) => {
  return (
    routeUid ||
    user?.consumerNumber ||
    user?.identifier ||
    user?.uid ||
    consumerData?.consumerNumber ||
    consumerData?.identifier ||
    consumerData?.uniqueIdentificationNo ||
    consumerData?.uid ||
    null
  );
};

const Notifications = ({ navigation, route }) => {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s14 = getScaledFontSize(14);
  const s12 = getScaledFontSize(12);
  // Get consumer data from context
  let consumerData = null;
  let user = null;

  try {
    const appContext = useApp();
    consumerData = appContext.consumerData;
    user = appContext.user;
  } catch (error) {
    console.log('AppProvider not available, using fallback values');
  }

  const [storedUser, setStoredUser] = useState(null);

  // When AppContext user is null (e.g. before load), fetch from storage
  useEffect(() => {
    if (!user) {
      getUser().then((u) => {
        if (u) setStoredUser(u);
      });
    } else {
      setStoredUser(null);
    }
  }, [user]);

  const effectiveUser = user || storedUser;
  const consumerUid = getLoggedInConsumerId(effectiveUser, consumerData, route?.params?.uid) || '—';

  // Get notification data from global context
  const {
    notifications,
    isLoading,
    error,
    markAsRead,
    refreshNotifications,
    setConsumerUid,
    consumerUid: currentConsumerUid,
    consumerNotifications = {}
  } = useNotifications();

  const hasLoadedCurrentConsumer = currentConsumerUid && !!consumerNotifications[currentConsumerUid]?.lastFetchTime;
  const consumerNotReady = consumerUid === '—' || consumerUid !== currentConsumerUid;
  const showLoading =
    notifications.length === 0 &&
    (isLoading || !hasLoadedCurrentConsumer || consumerNotReady);

  useEffect(() => {
    if (consumerUid && consumerUid !== '—' && consumerUid !== currentConsumerUid) {
      console.log(`🔄 Notifications: Switching to consumer ${consumerUid}`);
      setConsumerUid(consumerUid);
    }
  }, [consumerUid, currentConsumerUid, setConsumerUid]);

  // Display all notifications
  const displayNotifications = notifications;


  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'payment':
      case 'success':
        return HandBill;
      case 'warning':
      case 'alert':
      case 'due':
        return Calendar;
      case 'balance':
      case 'info':
        return CheapDollar;
      default:
        return NotificationIcon;
    }
  };


  const getNotificationVariant = (type) => {
    switch (type?.toLowerCase()) {
      case 'warning':
      case 'alert':
        return 'warning';
      case 'success':
      case 'payment':
        return 'success';
      case 'info':
      case 'balance':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleNotificationPress = useCallback(async (notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    if (notification.redirect_url) {
      navigation.navigate(notification.redirect_url);
    }
  }, [markAsRead, navigation]);

  const keyExtractor = useCallback((item) => String(item.id), []);
  const renderItem = useCallback(
    ({ item }) => (
      <NotificationCard
        title={item.title}
        message={item.message}
        sentAt={item.meta?.sentAt || item.created_at}
        icon={getNotificationIcon(item.type)}
        variant={getNotificationVariant(item.type)}
        isRead={item.is_read}
        onPress={() => handleNotificationPress(item)}
      />
    ),
    [handleNotificationPress]
  );
  const ItemSeparator = useMemo(() => () => <View style={styles.itemSeparator} />, []);
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isLoading}
        onRefresh={refreshNotifications}
        colors={[COLORS.secondaryFontColor]}
        tintColor={COLORS.secondaryFontColor}
      />
    ),
    [isLoading, refreshNotifications]
  );

  const listEmptyComponent = useMemo(() => {
    if (showLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.secondaryFontColor} />
          <Text style={[styles.loadingText, { fontSize: s14 }]}>Loading notifications...</Text>
        </View>
      );
    }
    if (error && displayNotifications.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { fontSize: s14 }]}>
            {error.includes('Failed to fetch')
              ? `Unable to load notifications for ${consumerUid}`
              : error}
          </Text>
          <Pressable style={styles.retryButton} onPress={refreshNotifications}>
            <Text style={[styles.retryButtonText, { fontSize: s14 }]}>Retry</Text>
          </Pressable>
        </View>
      );
    }
    if (displayNotifications.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { fontSize: s14 }]}>No notifications available</Text>
          <Text style={[styles.emptySubText, { fontSize: s12 }]}>for {consumerUid}</Text>
        </View>
      );
    }
    return null;
  }, [
    showLoading,
    error,
    displayNotifications.length,
    consumerUid,
    s14,
    s12,
    refreshNotifications,
  ]);

  const listHeaderComponent = useMemo(() => {
    if (error && displayNotifications.length > 0) {
      return (
        <View style={styles.refreshErrorBanner}>
          <Text style={[styles.refreshErrorText, { fontSize: s12 }]}>{error}</Text>
          <Text style={[styles.refreshErrorHint, { fontSize: s12 }]}>Pull down to try again.</Text>
        </View>
      );
    }
    return null;
  }, [error, displayNotifications.length, s12]);

  return (
    <View style={[styles.Container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style="light" />
      <View style={styles.TopMenu}>
        <Pressable
          style={styles.barsIcon}
          onPress={() => navigation.navigate("SideMenu")}
        >
          <Menu width={18} height={18} fill="#202d59" />
        </Pressable>
        <Pressable onPress={() => navigation.replace("PostPaidDashboard")}>
          {/* <Image icon={BiLogo} size={45} /> */}
          <Logo variant="white" size="medium" />
        </Pressable>
        <Pressable style={styles.bellIcon} onPress={() => navigation.replace("PostPaidDashboard")}>
          <Notification width={18} height={18} fill="#ffffff" />
        </Pressable>
      </View>

      <AppFlatList
        data={displayNotifications}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
        refreshControl={refreshControl}
        style={[styles.notificationsContainer, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={displayNotifications.length === 0 ? styles.listEmptyContent : undefined}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  Container: {
    backgroundColor: COLORS.brandBlueColor,
    height: "100%",
  },
  TopMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 15,
    paddingHorizontal: 30,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android shadow
    elevation: 5,
  },
  logo: {
    width: 80,
    height: 80,
    zIndex: 1,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    // Android shadow
    elevation: 5,
  },
  notificationsContainer: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 25,
    paddingTop: 10,
    marginBottom: 30,
  },
  listEmptyContent: {
    flexGrow: 1,
  },
  itemSeparator: {
    // height: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
  },
  emptySubText: {
    color: COLORS.secondaryFontColor,
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 4,
  },
  retryButton: {
    backgroundColor: COLORS.primaryColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    textAlign: 'center',
  },
  refreshErrorBanner: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
  },
  refreshErrorText: {
    color: COLORS.secondaryFontColor,
    fontFamily: 'Manrope-Medium',
  },
  refreshErrorHint: {
    color: COLORS.secondaryFontColor,
    fontFamily: 'Manrope-Regular',
    opacity: 0.8,
    marginTop: 4,
  },
});
