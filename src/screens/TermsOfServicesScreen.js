import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import Menu from '../../assets/icons/bars.svg';
import BackIcon from '../../assets/icons/Back.svg';
import Logo from '../components/global/Logo';

const LAST_UPDATED = 'January 1, 2024';

const SECTIONS = [
  {
    id: '01',
    title: 'Acceptance of Terms',
    body: 'By accessing and using this application, you accept and agree to be bound by the terms and provision of this agreement.',
  },
  {
    id: '02',
    title: 'Use License',
    body: 'Permission is granted to temporarily download one copy of the application for personal, non-commercial transitory viewing only.',
  },
  {
    id: '03',
    title: 'Disclaimer',
    body: "The materials on this application are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.",
  },
  {
    id: '04',
    title: 'Limitations',
    body: 'In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our application.',
  },
  {
    id: '05',
    title: 'Revisions and Errata',
    body: 'The materials appearing on our application could include technical, typographical, or photographic errors. We do not warrant that any of the materials on our application are accurate, complete or current.',
  },
  {
    id: '06',
    title: 'Links',
    body: 'We have not reviewed all of the sites linked to our application and are not responsible for the contents of any such linked site.',
  },
  {
    id: '07',
    title: 'Modifications',
    body: 'We may revise these terms of service for our application at any time without notice.',
  },
];

function SectionItem({ id, title, body, scaled }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionBadge}>
          <Text style={[styles.sectionBadgeText, scaled && { fontSize: scaled.badge }]}>{id}</Text>
        </View>
        <Text style={[styles.sectionTitle, scaled && { fontSize: scaled.title }]}>{title}</Text>
      </View>
      <Text style={[styles.sectionBody, scaled && { fontSize: scaled.body }]}>{body}</Text>
    </View>
  );
}

export default function TermsOfServicesScreen({ navigation }) {
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s12 = getScaledFontSize(12);
  const s13 = getScaledFontSize(13);
  const s14 = getScaledFontSize(14);
  const s16 = getScaledFontSize(16);
  const s24 = getScaledFontSize(24);
  const scaled = { badge: s12, title: s16, body: s14 };
  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.headerButton}
            onPress={() => navigation.navigate('SideMenu')}
            android_ripple={{ color: 'rgba(0,0,0,0.15)', borderless: false, radius: 27 }}
          >
            <Menu width={18} height={18} fill={COLORS.brandBlueColor} />
          </Pressable>

          <Pressable onPress={() => navigation.navigate('PostPaidDashboard')}>
            <Logo variant="white" size="medium" />
          </Pressable>

          <Pressable style={styles.headerButton} onPress={() => navigation.goBack()}>
            <BackIcon width={20} height={20} fill={COLORS.brandBlueColor} />
          </Pressable>
        </View>

        <Text style={[styles.pageTitle, { fontSize: s24 }]}>Terms Of Service</Text>
        <Text style={[styles.lastUpdated, { fontSize: s13 }]}>Last updated: {LAST_UPDATED}</Text>

        {SECTIONS.map((section) => (
          <SectionItem
            key={section.id}
            id={section.id}
            title={section.title}
            scaled={scaled}
            body={section.body}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.brandBlueColor,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 75,
    paddingBottom: 20,
    paddingHorizontal: 30,
  },
  headerButton: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Manrope-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 28,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.secondaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: '#FFFFFF',
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Manrope-SemiBold',
    color: '#FFFFFF',
  },
  sectionBody: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 22,
    paddingLeft: 44,
  },
});
