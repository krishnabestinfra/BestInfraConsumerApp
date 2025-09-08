import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { COLORS } from '../../constants/colors';

const NotificationCard = ({
  title,
  description,
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
  ...props
}) => {
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

  const cardElement = (
    <View style={[styles.container, containerStyle, style]} {...props}>
      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={[
            styles.title,
            { color: variantStyles.titleColor },
            titleStyle
          ]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.description, descriptionStyle]}>
              {description}
            </Text>
          )}
          {subDescription && (
            <Text style={[styles.description, subDescriptionStyle]}>
              {subDescription}
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
});

export default NotificationCard; 