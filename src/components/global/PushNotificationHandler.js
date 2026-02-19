import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import PushNotificationCard from './PushNotificationCard';
import { useNotifications } from '../../context/NotificationsContext';
import { useApp } from '../../context/AppContext';
import { addTestNotificationCardListener } from '../../services/pushNotificationService';
import { isRunningInExpoGo } from '../../utils/expoGoDetect';

/**
 * PushNotificationHandler Component
 * 
 * Handles incoming push notifications and displays them as in-app notifications
 * - Listens for push notifications
 * - Shows custom notification UI
 * - Handles notification taps
 * - Refreshes notification list when notification received
 */
const PushNotificationHandler = () => {
  const navigation = useNavigation();
  const [currentNotification, setCurrentNotification] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const { refreshNotifications } = useNotifications();
  const { user } = useApp();

  // Handle notification received (when app is in foreground)
  const handleNotificationReceived = useCallback((notification) => {
    console.log('📬 Push notification received:', notification);
    
    const notificationData = notification.request.content;
    
    // Extract notification data
    const title = notificationData.title || 'Hi!';
    const message = notificationData.body || notificationData.data?.message || '';
    const notificationId = notificationData.data?.notificationId || notification.request.identifier;
    
    // Show in-app notification
    setCurrentNotification({
      id: notificationId,
      title: getGreeting(title),
      message: message,
      data: notificationData.data,
    });
    setIsVisible(true);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setCurrentNotification(null), 300);
    }, 5000);

    // Refresh notification list in background
    refreshNotifications();
  }, [refreshNotifications]);

  // Handle notification tapped
  const handleNotificationTapped = useCallback((response) => {
    console.log('👆 Push notification tapped:', response);
    
    const notificationData = response.notification.request.content;
    const data = notificationData.data || {};
    
    // Hide notification
    setIsVisible(false);
    setCurrentNotification(null);

    // Handle navigation if redirect URL is provided
    if (data.redirect_url) {
      // Parse redirect URL and navigate
      const url = data.redirect_url;
      
      // Handle different navigation patterns
      if (url.includes('/tickets/') || url.includes('ticket')) {
        const ticketId = url.split('/tickets/')[1]?.split('/')[0] || 
                        url.split('ticket=')[1]?.split('&')[0];
        if (ticketId) {
          navigation?.navigate('TicketDetails', { ticketId });
        } else {
          navigation?.navigate('Tickets');
        }
      } else if (url.includes('/payments') || url.includes('payment')) {
        navigation?.navigate('Payments');
      } else if (url.includes('/profile') || url.includes('notification')) {
        navigation?.navigate('Profile');
      } else if (url.includes('/dashboard')) {
        navigation?.navigate('PostPaidDashboard');
      }
    } else if (data.type === 'ticket') {
      // Navigate to tickets if it's a ticket notification
      navigation?.navigate('Tickets');
    } else if (data.type === 'payment') {
      // Navigate to payments if it's a payment notification
      navigation?.navigate('Payments');
    } else {
      // Default: navigate to notifications page
      navigation?.navigate('Profile');
    }

    // Refresh notification list
    refreshNotifications();
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
        Notifications.getLastNotificationResponseAsync()
          .then((response) => {
            if (response) handleNotificationTapped(response);
          })
          .catch((err) => __DEV__ && console.warn('getLastNotificationResponse:', err?.message));
      } catch (e) {
        if (__DEV__) console.warn('Push listeners not available:', e?.message);
      }
    }

    const unsubTestCard = addTestNotificationCardListener(handleTestCardPayload);

    return () => {
      receivedSubscription?.remove?.();
      responseSubscription?.remove?.();
      unsubTestCard();
    };
  }, [handleNotificationReceived, handleNotificationTapped, handleTestCardPayload]);

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
