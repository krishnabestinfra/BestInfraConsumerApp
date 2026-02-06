import React, { useMemo, useCallback } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';

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
  const { getScaledFontSize, colors: themeColors, isDark } = useTheme();
  const s12 = getScaledFontSize(12);
  const s14 = getScaledFontSize(14);
  const s16 = getScaledFontSize(16);
  const getButtonStyle = useMemo(() => {
    const baseStyle = [styles.button, styles[size]];
    
    switch (variant) {
      case 'primary':
        baseStyle.push(styles.primary);
        if (isDark) baseStyle.push({ backgroundColor: themeColors.accent });
        break;
      case 'secondary':
        baseStyle.push(styles.secondary);
        break;
      case 'outline':
        baseStyle.push(styles.outline);
        if (isDark) baseStyle.push({ backgroundColor: 'transparent', borderColor: themeColors.accent });
        break;
      case 'ghost':
        baseStyle.push(styles.ghost);
        break;
      default:
        baseStyle.push(styles.primary);
        if (isDark) baseStyle.push({ backgroundColor: themeColors.accent });
    }

    // Disabled state styling
    if (disabled) {
      if (isDark && variant === 'primary') {
        baseStyle.push({ backgroundColor: '#1F2E34', borderColor: '#1F2E34' });
      } else {
        baseStyle.push(styles.disabled);
      }
    }

    return baseStyle;
  }, [variant, size, disabled, isDark, themeColors.accent]);

  const getTextStyle = useMemo(() => {
    const fontSize = size === 'small' ? s12 : size === 'large' ? s16 : s14;
    const baseTextStyle = [styles.text, styles[`${size}Text`], { fontSize }];
    
    switch (variant) {
      case 'primary':
        baseTextStyle.push(styles.primaryText);
        if (isDark) baseTextStyle.push({ color: themeColors.textOnPrimary });
        break;
      case 'secondary':
        baseTextStyle.push(styles.secondaryText);
        break;
      case 'outline':
        baseTextStyle.push(styles.outlineText);
        if (isDark) baseTextStyle.push({ color: themeColors.accent });
        break;
      case 'ghost':
        baseTextStyle.push(styles.ghostText);
        if (isDark) baseTextStyle.push({ color: themeColors.accent });
        break;
      default:
        baseTextStyle.push(styles.primaryText);
        if (isDark) baseTextStyle.push({ color: themeColors.textOnPrimary });
    }

    if (disabled) {
      baseTextStyle.push(styles.disabledText);
    }

    return baseTextStyle;
  }, [variant, size, disabled, isDark, themeColors.textOnPrimary, themeColors.accent, s12, s14, s16]);

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
          color={variant === 'primary' || variant === 'secondary' ? themeColors.textOnPrimary : themeColors.accent} 
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