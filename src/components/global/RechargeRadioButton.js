import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const RechargeRadioButton = ({
  label,
  amount,
  value,
  selectedValue,
  onSelect,
  disabled = false,
  style,
  ...props
}) => {
  const isSelected = selectedValue === value;

  const handlePress = () => {
    if (!disabled && onSelect) {
      onSelect(value);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isSelected && styles.containerSelected,
        disabled && styles.containerDisabled,
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={disabled}
      {...props}
    >
      <View style={styles.radioContainer}>
        <View style={styles.textContainer}>
          <Text style={[
            styles.label,
            isSelected && styles.labelSelected,
            disabled && styles.labelDisabled
          ]}>
            {label}
          </Text>
          <Text style={[
            styles.amount,
            isSelected && styles.amountSelected,
            disabled && styles.amountDisabled
          ]}>
            {amount}
          </Text>
        </View>
        <View style={[
          styles.radio,
          isSelected && styles.radioSelected
        ]}>
          {isSelected && <View style={styles.dot} />}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 8,
    // padding: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flex: 1,
    // minHeight: 70,
    justifyContent: 'flex-start',
    // paddingTop: 12,
  },
  containerSelected: {
    backgroundColor: COLORS.secondaryColor,
    borderColor: COLORS.secondaryColor,
    elevation: 1,
    shadowOpacity: 0.2,
  },
  containerDisabled: {
    opacity: 0.6,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    // height: '100%',
  },
  radio: {
    width: 12,
    height: 12,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#bbe1c4',
    backgroundColor: COLORS.secondaryFontColor,
    justifyContent: 'center',
    alignItems: 'center',
    // marginTop: 2,
  },
  radioSelected: {
    borderColor: '#bbe1c4',
    backgroundColor: COLORS.secondaryFontColor,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 3,
    backgroundColor: COLORS.secondaryFontColor,
  },
  textContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  label: {
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
    // marginBottom: 8,
    // textAlign: 'left',
  },
  labelSelected: {
    color: COLORS.secondaryFontColor,
    fontFamily: 'Manrope-Regular',
  },
  labelDisabled: {
    color: '#CCCCCC',
  },
  amount: {
    color: COLORS.secondaryColor,
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    textAlign: 'left',
  },
  amountSelected: {
    color: COLORS.secondaryFontColor,
  },
  amountDisabled: {
    color: '#CCCCCC',
  },
});

export default RechargeRadioButton;
