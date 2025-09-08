import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import LogoBlue from '../../../assets/icons/Logo.svg';
import LogoWhite from '../../../assets/icons/LogoWhite.svg';

const Logo = ({
  variant = 'blue', // 'blue' or 'white'
  size = 'medium', // 'small', 'medium', 'large', 'xlarge'
  width,
  height,
  style,
  onPress,
  pressable = false,
  disabled = false,
  ...props
}) => {
  const getSize = () => {
    if (width && height) {
      return { width, height };
    }
    
    switch (size) {
      case 'small':
        return { width: 80, height: 32 };
      case 'large':
        return { width: 160, height: 64 };
      case 'xlarge':
        return { width: 240, height: 96 };
      default: // medium
        return { width: 120, height: 48 };
    }
  };

  const getLogoSource = () => {
    return variant === 'white' ? LogoWhite : LogoBlue;
  };

  const getFillColor = () => {
    if (variant === 'white') {
      return COLORS.surfaceColor;
    }
    return COLORS.primaryColor;
  };

  const LogoComponent = getLogoSource();
  const dimensions = getSize();

  const logoElement = (
    <View 
      style={[
        styles.container, 
        dimensions, 
        style,
        disabled && styles.disabled
      ]} 
      {...props}
    >
      <LogoComponent 
        width={dimensions.width} 
        height={dimensions.height}
        fill={getFillColor()}
      />
    </View>
  );

  if (pressable && onPress && !disabled) {
    return (
      <View 
        style={[styles.pressableContainer, dimensions]}
        onTouchEnd={onPress}
      >
        {logoElement}
      </View>
    );
  }

  return logoElement;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressableContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default Logo; 