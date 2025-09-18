import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '../../constants/colors';

const NotificationCard = ({
  title,
  description,
  message, // New prop for notification message
  subDescription,
  icon,
  variant = 'default', // 'default', 'warning', 'success', 'info'
  onPress,
  style,
  containerStyle,
  titleStyle,
  descriptionStyle,
  subDescriptionStyle,
  iconStyle,
  iconContainerStyle,
  disabled = false,
  isRead = true, // New prop for read status
  sentAt, // New prop for timestamp
  showTimestamp = true, // New prop to control timestamp display
  ...props
}) => {
  // Format timestamp to human-readable format
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now - notificationTime) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    } else {
      return notificationTime.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          titleColor: '#FF7C5C',
          iconBgColor: '#FFF2EF',
          borderColor: '#FF7C5C',
        };
      case 'success':
        return {
          titleColor: COLORS.secondaryColor,
          iconBgColor: '#EEF8F0',
          borderColor: COLORS.secondaryColor,
        };
      case 'info':
        return {
          titleColor: COLORS.primaryColor,
          iconBgColor: '#E9EAEE',
          borderColor: COLORS.primaryColor,
        };
      default:
        return {
          titleColor: COLORS.primaryColor,
          iconBgColor: '#E9EAEE',
          borderColor: COLORS.primaryColor,
        };
    }
  };

  const variantStyles = getVariantStyles();

  // Use message if description is not provided
  const displayDescription = description || message;

  const cardElement = (
    <View style={[
      styles.container, 
      containerStyle, 
      style, 
      !isRead && styles.unreadContainer
    ]} {...props}>
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[
              styles.title,
              { color: variantStyles.titleColor },
              titleStyle,
              !isRead && styles.unreadTitle
            ]}>
              {title}
            </Text>
            {/* {!isRead && <View style={styles.unreadDot} />} */}
          </View>
          {displayDescription && (
            <Text style={[styles.description, descriptionStyle]}>
              {displayDescription}
            </Text>
          )}
          {subDescription && (
            <Text style={[styles.description, subDescriptionStyle]}>
              {subDescription}
            </Text>
          )}
          {showTimestamp && (sentAt || formatTimestamp(sentAt)) && (
            <Text style={[styles.timestamp, { color: variantStyles.titleColor }]}>
              {formatTimestamp(sentAt)}
            </Text>
          )}
        </View>
        {icon && (
          <View style={[
            styles.iconContainer,
            { backgroundColor: variantStyles.iconBgColor },
            iconContainerStyle
          ]}>
            {React.createElement(icon, { width: 16, height: 16 })}
          </View>
        )}
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable onPress={onPress} style={styles.pressable}>
        {cardElement}
      </Pressable>
    );
  }

  return cardElement;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondaryFontColor,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 5,
    marginBottom: 5,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    marginBottom: 4,
  },
  description: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    marginBottom: 2,
  },
  iconContainer: {
    width: 30,
    height: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressable: {
    // Pressable styling
  },
  unreadContainer: {
    backgroundColor: '#F8F9FF',
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryColor,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  unreadTitle: {
    fontFamily: 'Manrope-Bold',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryColor,
    marginLeft: 8,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
    opacity: 0.7,
    marginTop: 4,
  },
});

export default NotificationCard; 