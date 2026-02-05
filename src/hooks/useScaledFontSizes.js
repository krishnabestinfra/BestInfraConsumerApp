import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { fontSizes } from '../constants/typography';

/**
 * Returns scaled font sizes based on user's Settings preference (Default / 14 / 15 / 16).
 * Use these in style arrays so text respects the font size setting app-wide.
 */
export function useScaledFontSizes() {
  const { getScaledFontSize } = useTheme();
  return useMemo(
    () => ({
      tiny: getScaledFontSize(fontSizes.tiny),
      caption: getScaledFontSize(fontSizes.caption),
      small: getScaledFontSize(fontSizes.small),
      body: getScaledFontSize(fontSizes.body),
      bodyLarge: getScaledFontSize(fontSizes.bodyLarge),
      subhead: getScaledFontSize(fontSizes.subhead),
      title: getScaledFontSize(fontSizes.title),
      headline: getScaledFontSize(fontSizes.headline),
      display: getScaledFontSize(fontSizes.display),
      /** Scale any base number (e.g. custom 26) */
      scale: getScaledFontSize,
    }),
    [getScaledFontSize]
  );
}
