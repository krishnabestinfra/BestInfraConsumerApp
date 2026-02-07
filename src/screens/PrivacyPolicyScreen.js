import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, colors } from '../constants/colors';
import { useTheme } from '../context/ThemeContext';
import DashboardHeader from '../components/global/DashboardHeader';

const LAST_UPDATED = 'January 1, 2024';

const BG_LIGHT_GREEN = '#F2F8F2';

const SECTIONS = [
  {
    id: '01',
    title: 'Information We Collect',
    body: 'We collect information you provide directly to us, such as when you create an account, log in, or contact us for support.',
  },
  {
    id: '02',
    title: 'How We Use Your Information',
    body: 'We use the information we collect to provide, maintain, and improve our services; process transactions and send related information; send technical notices, updates, security alerts, and support messages; and respond to your comments, questions, and customer service requests.',
  },
  {
    id: '03',
    title: 'Information Sharing',
    body: 'We do not share, sell, or otherwise disclose your personal information for purposes other than those outlined in this Privacy Policy.',
  },
  {
    id: '04',
    title: 'Your Rights',
    body: 'You have the right to access your personal information, correct inaccurate personal information, request deletion of your personal information, and object to our processing of your personal information.',
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

function SectionItem({ id, title, body, scaled }) {
  return (
    <View style={styles.section}>
      <View style={styles.slnoBadge}>
        <Text style={[styles.slnoText, scaled && { fontSize: scaled.badge }]}>{id}</Text>
      </View>
      <Text style={[styles.sectionTitle, scaled && { fontSize: scaled.title }]}>{title}</Text>
      <Text style={[styles.sectionBody, scaled && { fontSize: scaled.body }]}>{body}</Text>
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
      <StatusBar style="dark" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader
          navigation={navigation}
          rightIcon="back"
          showProfileSection={false}
          showRings={false}
        />
        <View style={styles.card}>
          <Text style={[styles.pageTitle, { fontSize: s24 }]}>Privacy Policy</Text>
          <Text style={[styles.lastUpdated, { fontSize: s13 }]}>Last updated: {LAST_UPDATED}</Text>

          {SECTIONS.map((section) => (
            <SectionItem
              key={section.id}
              id={section.id}
              title={section.title}
              body={section.body}
              scaled={scaled}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG_LIGHT_GREEN,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 48,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 5,
    padding: 24,
    marginTop: 16,
  },
  pageTitle: {
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: colors.color_text_primary,
    marginBottom: 6,
  },
  lastUpdated: {
    fontSize: 13,
    fontFamily: 'Manrope-Regular',
    color: colors.color_text_secondary,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  slnoBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#B9E0BE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  slnoText: {
    fontSize: 12,
    fontFamily: 'Manrope-SemiBold',
    color: '#5BB56C',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
    color: colors.color_text_primary,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 12,
    fontFamily: 'Manrope-Regular',
    color: colors.color_text_secondary,
    lineHeight: 22,
  },
});
