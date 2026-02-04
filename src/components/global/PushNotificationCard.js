import React from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { COLORS } from '../../constants/colors';
import Logo from './Logo';

/**
 * PushNotificationCard Component
 * 
 * Displays in-app push notifications matching the NexusOne design
 * Shows: Logo, "NexusOne • now", greeting, and message
 */
const PushNotificationCard = ({
  title = "Hi!",
  message,
  onPress,
  onDismiss,
  visible = true,
  style,
}) => {
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      // Slide in animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const cardContent = (
    <Animated.View
      style={[
        styles.container,
        style,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      {/* Header with Logo and "NexusOne • now" */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Logo variant="blue" size="small" />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.brandName}>NexusOne</Text>
          <View style={styles.dot} />
          <Text style={styles.timeText}>now</Text>
        </View>
        {onDismiss && (
          <Pressable style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissIcon}>⌄</Text>
          </Pressable>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.greeting}>{title}</Text>
        {message && (
          <Text style={styles.message} numberOfLines={3}>
            {message}
          </Text>
        )}
      </View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 10,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Android shadow
    elevation: 4,
  },
  pressable: {
    // Pressable wrapper
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoContainer: {
    marginRight: 8,
  },
  headerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  brandName: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: COLORS.brandBlueColor,
    marginRight: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.brandBlueColor,
    marginRight: 4,
  },
  timeText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: '#666',
  },
  dismissButton: {
    padding: 4,
  },
  dismissIcon: {
    fontSize: 16,
    color: '#999',
    fontFamily: 'Manrope-Regular',
  },
  content: {
    marginTop: 4,
  },
  greeting: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: COLORS.primaryFontColor,
    marginBottom: 6,
  },
  message: {
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    color: '#666',
    lineHeight: 18,
  },
});

export default PushNotificationCard;
