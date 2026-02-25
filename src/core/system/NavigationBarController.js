import { useEffect } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "../../context/ThemeContext";

export default function NavigationBarController() {
  const { isDark } = useTheme();

  useEffect(() => {
    if (Platform.OS === "android") {
      if (isDark) {
        NavigationBar.setBackgroundColorAsync("#121212"); // dark mode
        NavigationBar.setButtonStyleAsync("light");
      } else {
        NavigationBar.setBackgroundColorAsync("#ffffff"); // light mode
        NavigationBar.setButtonStyleAsync("dark");
      }
    }
  }, [isDark]);

  return null;
}