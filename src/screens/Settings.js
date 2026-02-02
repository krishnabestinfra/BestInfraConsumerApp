import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import React from "react";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import Menu from "../../assets/icons/bars.svg";
import Logo from "../components/global/Logo";
// Import icons - placeholder comments for icons you'll need to add
import ThemeIcon from "../../assets/icons/theme.svg";
import FontSizeIcon from "../../assets/icons/fontIcon.svg";
import LanguageIcon from "../../assets/icons/language.svg";
import HelpIcon from "../../assets/icons/questionMark.svg";
import TermsIcon from "../../assets/icons/info.svg";
// import PrivacyIcon from "../../assets/icons/privacyIcon.svg";
// import VersionIcon from "../../assets/icons/versionIcon.svg";
import ChevronRight from "../../assets/icons/rightArrow.svg";
import LogoutIcon from "../../assets/icons/signOut.svg";

const Settings = ({ navigation }) => {
  const appVersion = "1.0.26";

  const PreferenceItem = ({ icon, title, subtitle, onPress, showChevron = true }) => (
    <Pressable
      style={styles.settingItem}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
    >
      <View style={styles.settingItemLeft}>
        <View style={styles.iconContainer}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && (
        <View style={styles.chevronContainer}>
          <ChevronRight width={24} height={24} />
        </View>
      )}
    </Pressable>
  );

  return (
    <View style={styles.Container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.TopMenu}>
        <Pressable
          style={styles.barsIcon}
          onPress={() => navigation.navigate("SideMenu")}
          android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, radius: 27 }}
        >
          <Menu width={18} height={18} fill={COLORS.brandBlueColor} />
        </Pressable>

        <Pressable onPress={() => navigation.navigate("PostPaidDashboard")}>
          <Logo variant="white" size="medium" />
        </Pressable>

        <Pressable
          style={styles.bellIcon}
          onPress={() => navigation.goBack()}
        >
          <LogoutIcon width={20} height={20} fill={COLORS.brandBlueColor} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PREFERENCES Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PREFERENCES</Text>

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <ThemeIcon width={24} height={24} />
              </View>
            }
            title="Theme"
            subtitle="Dark"
            onPress={() => { }}
          />

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <FontSizeIcon width={24} height={24} />
              </View>
            }
            title="Font Size"
            subtitle="13 Px"
            onPress={() => { }}
          />

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <LanguageIcon width={24} height={24} />
              </View>
            }
            title="Language"
            subtitle="English"
            onPress={() => { }}
          />
        </View>

        {/* ABOUT Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT</Text>

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <HelpIcon width={24} height={24} />
              </View>
            }
            title="Help & Support"
            onPress={() => { }}
          />

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <TermsIcon width={24} height={24} />
              </View>
            }
            title="Terms of Service"
            onPress={() => { }}
          />

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <TermsIcon width={24} height={24} />
              </View>
            }
            title="Privacy Policy"
            onPress={() => { }}
          />

          <PreferenceItem
            icon={
              <View style={styles.iconPlaceholder}>
                <TermsIcon width={24} height={24} />
              </View>
            }
            title="App Version"
            subtitle={appVersion}
            showChevron={false}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default Settings;

const styles = StyleSheet.create({
  Container: {
    flex: 1,
    backgroundColor: COLORS.brandBlueColor,
  },
  TopMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 20,
    paddingHorizontal: 30,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 10
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 1,
    paddingLeft: 4,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPlaceholder: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 16,
    color: COLORS.secondaryFontColor,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  settingTitle: {
    fontSize: 15,
    fontFamily: "Manrope-Medium",
    color: COLORS.secondaryFontColor,
  },
  settingSubtitle: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "rgba(255, 255, 255, 0.5)",
  },
  chevronContainer: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  chevronText: {
    fontSize: 20,
    color: "rgba(255, 255, 255, 0.5)",
    fontWeight: "300",
  },
});
