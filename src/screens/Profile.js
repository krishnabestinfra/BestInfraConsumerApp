import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notificationsWhite.svg";
import NotificationIcon from "../../assets/icons/notificationDark.svg";
import BiLogo from "../../assets/icons/LogoWhite.svg";
import HandBill from "../../assets/icons/handBill.svg";
import Calendar from "../../assets/icons/calendar.svg";
import CheapDollar from "../../assets/icons/cheapDollar.svg";
import NotificationCard from "../components/global/NotificationCard";
import Logo from "../components/global/Logo";
import { COLORS } from "../constants/colors";
import { useApp } from "../context/AppContext";
import { useNotifications } from "../context/NotificationsContext";

const Profile = ({ navigation, route }) => {
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

  // Get consumer UID from route params or consumer data with fallback
  const consumerUid = route?.params?.uid || consumerData?.uid || user?.identifier || 'BI25GMRA0001';

  // Get notification data from global context
  const { 
    notifications, 
    isLoading, 
    error, 
    markAsRead, 
    refreshNotifications,
    setConsumerUid,
    consumerUid: currentConsumerUid
  } = useNotifications();

  // Update consumer UID in context when it changes
  useEffect(() => {
    if (consumerUid && consumerUid !== currentConsumerUid) {
      console.log(`🔄 Profile: Switching to consumer ${consumerUid}`);
      setConsumerUid(consumerUid);
    }
  }, [consumerUid, currentConsumerUid, setConsumerUid]);

  // Get only the first 2 notifications as per requirement
  const displayNotifications = notifications.slice(0, 2);

  // Get appropriate icon based on notification type
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

  // Get notification variant based on type
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

  const handleNotificationPress = async (notification) => {
    console.log('Notification pressed:', notification.title);
    
    // Mark as read if not already read
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.redirect_url) {
      console.log('Redirect URL:', notification.redirect_url);
      // Handle navigation to redirect URL if needed
    }
  };

  return (
    <View style={styles.Container}>
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
      
      <ScrollView
        style={styles.notificationsContainer}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshNotifications}
            colors={[COLORS.secondaryFontColor]}
            tintColor={COLORS.secondaryFontColor}
          />
        }
      >
        {isLoading && displayNotifications.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.secondaryFontColor} />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : error && displayNotifications.length === 0 ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error.includes('Failed to fetch') ? 
                `Unable to load notifications for ${consumerUid}` : 
                error
              }
            </Text>
            <Pressable style={styles.retryButton} onPress={refreshNotifications}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : displayNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No notifications available</Text>
            <Text style={styles.emptySubText}>for {consumerUid}</Text>
          </View>
        ) : (
          displayNotifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              title={notification.title}
              message={notification.message}
              sentAt={notification.meta?.sentAt || notification.created_at}
              icon={getNotificationIcon(notification.type)}
              variant={getNotificationVariant(notification.type)}
              isRead={notification.is_read}
              onPress={() => handleNotificationPress(notification)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

export default Profile;

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
    paddingVertical: 20,
    paddingHorizontal:25,
    paddingTop: 10,
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
});
