import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PushNotificationCard from './PushNotificationCard';
import { useNotifications } from '../../context/NotificationsContext';
import { useApp } from '../../context/AppContext';
import { addTestNotificationCardListener } from '../../services/pushNotificationService';
import { isRunningInExpoGo } from '../../utils/expoGoDetect';

/** Only handle "last notification response" once per app session to avoid redirect on every open. */
let lastNotificationResponseHandledForSession = false;

/**
 * Navigate only when we have explicit intent (redirect_url or type). Otherwise do not redirect
 * so the user is not sent to Notifications on cold start or when notification has no target.
 */
function navigateFromNotificationData(navigation, data) {
  if (!navigation || !data) return false;
  if (data.redirect_url) {
    const url = data.redirect_url;
    if (url.includes('/tickets/') || url.includes('ticket')) {
      const ticketId = url.split('/tickets/')[1]?.split('/')[0] || url.split('ticket=')[1]?.split('&')[0];
      if (ticketId) {
        navigation.navigate('TicketDetails', { ticketId });
      } else {
        navigation.navigate('Tickets');
      }
      return true;
    }
    if (url.includes('/payments') || url.includes('payment')) {
      navigation.navigate('Payments');
      return true;
    }
    if (url.includes('/profile') || url.includes('notification')) {
      navigation.navigate('Notifications');
      return true;
    }
    if (url.includes('/dashboard')) {
      navigation.navigate('PostPaidDashboard');
      return true;
    }
  }
  if (data.type === 'ticket') {
    navigation.navigate('Tickets');
    return true;
  }
  if (data.type === 'payment') {
    navigation.navigate('Payments');
    return true;
  }
  return false;
}

/**
 * PushNotificationHandler Component
 *
 * Handles incoming push notifications and displays them as in-app notifications.
 * Does NOT redirect to Notifications screen unless the notification has an explicit target
 * (redirect_url or type), so app open from icon or generic taps no longer force that screen.
 */
const PushNotificationHandler = () => {
  const navigation = useNavigation();
  const [currentNotification, setCurrentNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { refreshNotifications } = useNotifications();
  const { user } = useApp();
  const isMountedRef = useRef(true);

  // Handle notification received (when app is in foreground)
  const handleNotificationReceived = useCallback((notification) => {
    console.log('📬 Push notification received:', notification);

    const notificationData = notification.request.content;

    const title = notificationData.title || 'Hi!';
    const message = notificationData.body || notificationData.data?.message || '';
    const notificationId = notificationData.data?.notificationId || notification.request.identifier;

    setCurrentNotification({
      id: notificationId,
      title: getGreeting(title),
      message: message,
      data: notificationData.data,
    });
    setIsVisible(true);

    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setCurrentNotification(null), 300);
    }, 5000);

    refreshNotifications();
  }, [refreshNotifications]);

  // Handle notification tapped: only navigate when we have explicit redirect_url or type.
  // Do NOT default to Notifications so other screens are not affected and cold start doesn't redirect.
  const handleNotificationTapped = useCallback((response) => {
    console.log('👆 Push notification tapped:', response);

    const notificationData = response.notification.request.content;
    const data = notificationData.data || {};

    setIsVisible(false);
    setCurrentNotification(null);

    const didNavigate = navigateFromNotificationData(navigation, data);
    if (!didNavigate) {
      // No explicit target: refresh list only, stay on current screen
      refreshNotifications();
    } else {
      refreshNotifications();
    }
  }, [navigation, refreshNotifications]);

  // Get personalized greeting
  const getGreeting = (title) => {
    if (title && title !== 'Hi!' && !title.toLowerCase().includes('hi')) {
      return title;
    }
    
    const userName = user?.name || user?.consumerName || '';
    if (userName && userName !== 'Guest' && !userName.match(/^BI25GMRA\d+$/)) {
      return `Hi ${userName.split(' ')[0]}!`;
    }
    return 'Hi!';
  };

  // Show BI (NexusOne) in-app card when test is requested from Settings
  const handleTestCardPayload = useCallback((payload) => {
    const title = payload.title || 'Hi!';
    const message = payload.body || payload.message || '';
    setCurrentNotification({
      id: 'test',
      title: getGreeting(title),
      message,
      data: payload.data || {},
    });
    setIsVisible(true);
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setCurrentNotification(null), 300);
    }, 5000);
    refreshNotifications();
  }, [refreshNotifications]);

  // Set up notification listeners (skip expo-notifications in Expo Go — SDK 53 removed push there)
  useEffect(() => {
    isMountedRef.current = true;
    let receivedSubscription = null;
    let responseSubscription = null;

    if (!isRunningInExpoGo()) {
      try {
        const Notifications = require('expo-notifications');
        receivedSubscription = Notifications.addNotificationReceivedListener(
          handleNotificationReceived
        );
        responseSubscription = Notifications.addNotificationResponseReceivedListener(
          handleNotificationTapped
        );
        // Only run once per app session so we don't redirect on every cold start (stale response).
        // Only navigate when notification has explicit redirect_url or type; never default to Notifications.
        if (!lastNotificationResponseHandledForSession) {
          lastNotificationResponseHandledForSession = true;
          Notifications.getLastNotificationResponseAsync()
            .then((response) => {
              if (!response || !isMountedRef.current) return;
              const data = response.notification?.request?.content?.data || {};
              navigateFromNotificationData(navigation, data);
              refreshNotifications();
            })
            .catch((err) => __DEV__ && console.warn('getLastNotificationResponse:', err?.message));
        }
      } catch (e) {
        if (__DEV__) console.warn('Push listeners not available:', e?.message);
      }
    }

    const unsubTestCard = addTestNotificationCardListener(handleTestCardPayload);

    return () => {
      isMountedRef.current = false;
      receivedSubscription?.remove?.();
      responseSubscription?.remove?.();
      unsubTestCard();
    };
  }, [handleNotificationReceived, handleNotificationTapped, handleTestCardPayload, navigation, refreshNotifications]);

  // Handle card press
  const handleCardPress = useCallback(() => {
    if (currentNotification) {
      handleNotificationTapped({
        notification: {
          request: {
            content: {
              data: currentNotification.data || {},
            },
          },
        },
      });
    }
  }, [currentNotification, handleNotificationTapped]);

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => setCurrentNotification(null), 300);
  }, []);

  if (!currentNotification) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <PushNotificationCard
        title={currentNotification.title}
        message={currentNotification.message}
        visible={isVisible}
        onPress={handleCardPress}
        onDismiss={handleDismiss}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});

export default PushNotificationHandler;
