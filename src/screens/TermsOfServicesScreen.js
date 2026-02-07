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
      <View style={styles.slnoBadge}>
        <Text style={[styles.slnoText, scaled && { fontSize: scaled.badge }]}>{id}</Text>
      </View>
      <Text style={[styles.sectionTitle, scaled && { fontSize: scaled.title }]}>{title}</Text>
      <Text style={[styles.sectionBody, scaled && { fontSize: scaled.body }]}>{body}</Text>
    </View>
  );
}

export default function TermsOfServicesScreen({ navigation }) {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: 'Manrope-Bold',
    color: colors.color_text_primary,
    marginBottom: 6,
  },
  lastUpdated: {
    fontSize: 10,
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
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
    color: colors.color_text_primary,
    marginBottom: 8,
  },
  sectionBody: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: colors.color_text_secondary,
    lineHeight: 22,
  },
});
