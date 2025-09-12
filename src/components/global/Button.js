import React, { useMemo, useCallback } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';

const Button = React.memo(({
  title,
  onPress,
  variant = 'primary', // 'primary', 'secondary', 'outline', 'ghost' ,'primary-outline', 'disabled'
  size = 'medium', // 'small', 'medium', 'large'
  disabled = false,
  loading = false,
  style,
  textStyle,
  children,
  ...props
}) => {
  const getButtonStyle = useMemo(() => {
    const baseStyle = [styles.button, styles[size]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primary);
        break;
      case 'secondary':
        baseStyle.push(styles.secondary);
        break;
      case 'outline':
        baseStyle.push(styles.outline);
        break;
      case 'ghost':
        baseStyle.push(styles.ghost);
        break;
      default:
        baseStyle.push(styles.primary);
    }

    if (disabled) {
      baseStyle.push(styles.disabled);
    }

    return baseStyle;
  }, [variant, size, disabled]);

  const getTextStyle = useMemo(() => {
    const baseTextStyle = [styles.text, styles[`${size}Text`]];
    
    switch (variant) {
      case 'primary':
        baseTextStyle.push(styles.primaryText);
        break;
      case 'secondary':
        baseTextStyle.push(styles.secondaryText);
        break;
      case 'outline':
        baseTextStyle.push(styles.outlineText);
        break;
      case 'ghost':
        baseTextStyle.push(styles.ghostText);
        break;
      default:
        baseTextStyle.push(styles.primaryText);
    }

    if (disabled) {
      baseTextStyle.push(styles.disabledText);
    }

    return baseTextStyle;
  }, [variant, size, disabled]);

  const handlePress = useCallback(() => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  }, [disabled, loading, onPress]);

  return (
    <Pressable
      style={[getButtonStyle, style]}
      onPress={handlePress}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' ? COLORS.secondaryFontColor : COLORS.secondaryColor} 
          size="small" 
        />
      ) : (
        <>
          {children}
          {title && <Text style={[getTextStyle, textStyle]}>{title}</Text>}
        </>
      )}
    </Pressable>
  );
});

Button.displayName = 'Button';

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    fontFamily: 'Manrope-Medium',
  },
  // Size variants
  small: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 36,
  },
  medium: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 48,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 56,
  },
  // Variant styles
  primary: {
    backgroundColor: COLORS.secondaryColor,
  },
  secondary: {
    backgroundColor: COLORS.primaryColor,
  },
  outline: {
    backgroundColor: '#F8F8F8',
    borderWidth: 1,
    borderColor: COLORS.secondaryColor,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  disabled: {
    backgroundColor: '#e0e0e0',
    borderColor: '#e0e0e0',
  },
  // Text styles
  text: {
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',

  },
  smallText: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
  },
  mediumText: {
    fontSize: 14,
  },
  largeText: {
    fontSize: 16,
  },
  primaryText: {
    color: COLORS.secondaryFontColor,
  },
  secondaryText: {
    color: COLORS.secondaryFontColor,
  },
  outlineText: {
    color: COLORS.secondaryColor,
  },
  ghostText: {
    color: COLORS.secondaryColor,
  },
  disabledText: {
    color: '#999',
  },
});

export default Button; 