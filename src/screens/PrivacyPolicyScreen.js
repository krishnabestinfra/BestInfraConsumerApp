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
    title: 'Information We Collect',
    body: 'We collect information you provide directly to us, such as when you create an account, log in, or contact us for support.',
  },
  {
    id: '02',
    title: 'How We Use Your Information',
    body: 'We use the information we collect to',
    bullets: [
      'Provide, maintain, and improve our services',
      'Process transactions and send related information',
      'Send technical notices, updates, security alerts, and support messages',
      'Respond to your comments, questions, and customer service requests',
    ],
  },
  {
    id: '03',
    title: 'Information Sharing',
    body: 'We do not share, sell, or otherwise disclose your personal information for purposes other than those outlined in this Privacy Policy.',
  },
  {
    id: '04',
    title: 'Your Rights',
    body: 'You have the right to',
    bullets: [
      'Access your personal information',
      'Correct inaccurate personal information',
      'Request deletion of your personal information',
      'Object to our processing of your personal information',
    ],
  },
  {
    id: '05',
    title: 'Changes to This Policy',
    body: 'We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.',
  },
  {
    id: '06',
    title: 'Contact Us',
    body: 'If you have any questions about this Privacy Policy, please contact us.',
  },
];

function SectionItem({ id, title, body, bullets, scaled }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionBadge}>
          <Text style={[styles.sectionBadgeText, scaled && { fontSize: scaled.badge }]}>{id}</Text>
        </View>
        <Text style={[styles.sectionTitle, scaled && { fontSize: scaled.title }]}>{title}</Text>
      </View>
      <View style={styles.sectionContent}>
        {body ? <Text style={[styles.sectionBody, scaled && { fontSize: scaled.body }]}>{body}</Text> : null}
        {bullets?.length
          ? bullets.map((item, index) => (
              <View key={index} style={styles.bulletRow}>
                <Text style={[styles.bullet, scaled && { fontSize: scaled.body }]}>•</Text>
                <Text style={[styles.bulletText, scaled && { fontSize: scaled.body }]}>{item}</Text>
              </View>
            ))
          : null}
      </View>
    </View>
  );
}

export default function PrivacyPolicyScreen({ navigation }) {
  const { getScaledFontSize } = useTheme();
  const s12 = getScaledFontSize(12);
  const s13 = getScaledFontSize(13);
  const s14 = getScaledFontSize(14);
  const s16 = getScaledFontSize(16);
  const s24 = getScaledFontSize(24);
  const scaled = { badge: s12, title: s16, body: s14 };
  return (
    <View style={styles.container}>
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

        <Text style={[styles.pageTitle, { fontSize: s24 }]}>Privacy Policy</Text>
        <Text style={[styles.lastUpdated, { fontSize: s13 }]}>Last updated: {LAST_UPDATED}</Text>

        {SECTIONS.map((section) => (
          <SectionItem
            key={section.id}
            id={section.id}
            title={section.title}
            body={section.body}
            bullets={section.bullets}
            scaled={scaled}
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
  sectionContent: {
    paddingLeft: 44,
  },
  sectionBody: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 22,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  bullet: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    marginRight: 8,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 22,
  },
});
