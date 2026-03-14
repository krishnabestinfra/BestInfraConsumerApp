import React, { useMemo } from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const ScaledText = React.forwardRef(({ style, ...props }, ref) => {
  const { getScaledFontSize } = useTheme();

  const scaledStyle = useMemo(() => {
    try {
      const flat = StyleSheet.flatten(style || {});
      if (!flat || typeof flat.fontSize !== 'number') return style;
      return [style, { fontSize: getScaledFontSize(flat.fontSize) }];
    } catch {
      return style;
    }
  }, [style, getScaledFontSize]);

  return <RNText ref={ref} style={scaledStyle} {...props} />;
});

ScaledText.displayName = 'ScaledText';

export default ScaledText;
export { ScaledText as Text };
