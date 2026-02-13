import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import { useTheme } from "../context/ThemeContext";
import React, { useState, useEffect } from "react";
import ChevronRight from "../../assets/icons/rightArrow.svg";
import { apiClient } from "../services/apiClient";
import ChatIcon from "../../assets/icons/chatIcon.svg";
import TimelineCheckBlue from "../../assets/icons/timeLineCheckBlue.svg";
import TimelineCheckGreen from "../../assets/icons/timeLineCheckGreen.svg";
import DashboardHeader from "../components/global/DashboardHeader";
import BottomNavigation from "../components/global/BottomNavigation";
import { formatFrontendDateTime } from "../utils/dateUtils";

const DARK_CARD_BG = "#1A1F2E";

const TicketDetails = ({ navigation, route }) => {
  const { isDark, colors: themeColors } = useTheme();

  // Get ticket data from navigation params (support both raw API shape { data } and unwrapped ticket)
  const params = route?.params || {};
  const rawTicketData = params.ticketData;
  const paramsTicket = rawTicketData?.data ?? rawTicketData;
  const { ticketId, category, status } = params;

  // Fetch full ticket from API when we have an id (GET /gmr/api/tickets/:id)
  const [fetchedTicket, setFetchedTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const apiId = paramsTicket?.id ?? ticketId;

  useEffect(() => {
    if (!apiId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .getTicketDetails(apiId)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res?.data) {
          setFetchedTicket(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setFetchedTicket(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [apiId]);

  // Use API data when available, else fall back to params
  const ticketData = fetchedTicket ?? paramsTicket;

  // Normalized priority used across header and details
  const priority = (ticketData?.priority || category || "High") ?? "High";

  // Sample timeline data - replace with actual data from API
  const timelineData = ticketData?.timeline || [
    {
      id: 1,
      title: "Ticket Created",
      description: "Your ticket has been registered",
      date: "24 Jan, 09:00 am",
      completed: true,
      resolved: false,
    },
    {
      id: 2,
      title: "Assigned to Technician",
      description: "Suresh M. will handle your request",
      date: "24 Jan, 11:30 am",
      completed: true,
      resolved: false,
    },
    {
      id: 3,
      title: "Under Investigation",
      description: "Technician inspecting the area",
      date: "25 Jan, 02:00 pm",
      completed: true,
      resolved: false,
    },
    {
      id: 4,
      title: "Issue Resolved",
      description: "Your ticket has been Resolved",
      date: "24 Jan 03:00 pm",
      completed: true,
      resolved: true,
    },
  ];

  const getPriorityStyle = (priority) => {
    const p = priority?.toLowerCase();
    if (p === "low") return styles.lowPriority;
    if (p === "medium") return styles.mediumPriority;
    return styles.highPriority;
  };

  const handleChatSupport = () => {
    navigation.navigate("ChatSupport", {
      ticketId: ticketData?.ticketNumber || ticketId,
      ticketData: ticketData,
    });
  };

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.screen }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        style={[styles.scrollContainer, isDark && { backgroundColor: themeColors.screen }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHeader navigation={navigation} showBalance={false} showProfileSection={false} />

        {loading && !ticketData ? (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, isDark && { color: themeColors.textSecondary }]}>
              Loading ticket…
            </Text>
          </View>
        ) : (
        <View style={styles.scrollBody}>
          {/* Ticket Details Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, isDark && { color: themeColors.textPrimary }]}>
              Ticket Details
            </Text>
            <View style={[styles.priorityBadge, getPriorityStyle(priority)]}>
              <Text style={styles.priorityText}>
                {priority}
              </Text>
            </View>
          </View>

          <View style={[styles.detailsCard, isDark && { backgroundColor: DARK_CARD_BG }]}>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, isDark && { color: themeColors.textSecondary }]}>
                  Ticket ID
                </Text>
                <Text style={[styles.detailValue, isDark && { color: themeColors.textPrimary }]}>
                  #{ticketData?.ticketNumber || ticketId || "298"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, isDark && { color: themeColors.textSecondary }]}>
                  Category
                </Text>
                <Text style={[styles.detailValue, isDark && { color: themeColors.textPrimary }]}>
                  {ticketData?.category || category || "Connection Issue"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, isDark && { color: themeColors.textSecondary }]}>
                  Status
                </Text>
                <Text style={[styles.detailValue, isDark && { color: themeColors.textPrimary }]}>
                  {ticketData?.status || status || "Open"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, isDark && { color: themeColors.textSecondary }]}>
                  Created On
                </Text>
                <Text style={[styles.detailValue, isDark && { color: themeColors.textPrimary }]}>
                  {formatFrontendDateTime(ticketData?.createdAt) || "—"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, isDark && { color: themeColors.textSecondary }]}>
                  Last Updated
                </Text>
                <Text style={[styles.detailValue, isDark && { color: themeColors.textPrimary }]}>
                  {formatFrontendDateTime(ticketData?.updatedAt || ticketData?.updatedOn) || "—"}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={[styles.detailLabel, isDark && { color: themeColors.textSecondary }]}>
                  Assigned to
                </Text>
                <Text style={[styles.detailValue, isDark && { color: themeColors.textPrimary }]}>
                  {ticketData?.assignedTo || "BI-Tech Team"}
                </Text>
              </View>
            </View>
          </View>

          {/* Ticket Timeline Section */}
          <Text style={[styles.timelineTitle, isDark && { color: themeColors.textPrimary }]}>
            Ticket Timeline
          </Text>

          <View style={[styles.timelineCard, isDark && { backgroundColor: DARK_CARD_BG }]}>
            {timelineData.map((item, index) => (
              <View key={item.id} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineIcon, isDark && { backgroundColor: "rgba(255,255,255,0.08)" }]}>
                    {item.resolved ? (
                      <TimelineCheckGreen width={12} height={12} />
                    ) : item.completed ? (
                      <TimelineCheckBlue width={12} height={12} />
                    ) : (
                      <View style={styles.timelineIconPending} />
                    )}
                  </View>
                  {index < timelineData.length - 1 && (
                    <View style={[
                      styles.timelineLine,
                      item.completed && styles.timelineLineCompleted,
                      isDark && { backgroundColor: "rgba(255,255,255,0.08)" }
                    ]} />
                  )}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineItemTitle, isDark && { color: themeColors.textPrimary }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.timelineItemDescription, isDark && { color: themeColors.textSecondary }]}>
                    {item.description}
                  </Text>
                  <Text style={[styles.timelineItemDate, isDark && { color: themeColors.textSecondary }]}>
                    {item.date}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Chat Support Button */}
          <TouchableOpacity
            style={styles.chatSupportButton}
            onPress={handleChatSupport}
            activeOpacity={0.8}
          >
            <View style={styles.chatSupportLeft}>
              <View style={styles.chatIconWrapper}>
                <ChatIcon width={20} height={20} fill="#FFFFFF" />
              </View>
              <Text style={styles.chatSupportText}>Chat Support</Text>
            </View>
            <ChevronRight width={24} height={24} />
          </TouchableOpacity>
        </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavigation navigation={navigation} />
    </View>
  );
};

export default TicketDetails;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF8F0",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 180, 
  },
  loadingWrap: {
    padding: 24,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: "#6B7280",
  },
  scrollBody: {
    paddingHorizontal: 30,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  priorityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  highPriority: {
    backgroundColor: "#EF4444",
  },
  mediumPriority: {
    backgroundColor: "#F59E0B",
  },
  lowPriority: {
    backgroundColor: "#10B981",
  },
  priorityText: {
    fontSize: 10,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  detailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    padding: 20,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  detailItem: {
    width: "47%",
    gap: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: "#000000",
  },
  detailValue: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
  },
  timelineTitle: {
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    padding: 20,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 80,
  },
  timelineLeft: {
    alignItems: "center",
    width: 40,
    gap: 4,
  },
  timelineIcon: {
    width: 20,
    height: 20,
    borderRadius: 14,
    backgroundColor: "#E8EBF2CC",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineIconPending: {
    width: 11,
    height: 10,
    borderRadius: 5.5,
    backgroundColor: "#9CA3AF",
  },
  timelineLine: {
    width: 3,
    // flex: 1,
    height: 45,
    backgroundColor: "#E8EBF2CC",
    // marginTop: 2,
  },
  timelineLineCompleted: {
    backgroundColor: "#E8EBF2CC",
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 0,
    paddingBottom: 16,
    marginTop: -2,
    gap: 2,
  },
  timelineItemTitle: {
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
    lineHeight: 16,
    includeFontPadding: false,
  },
  timelineItemDescription: {
    fontSize: 13,
    fontFamily: "Manrope-Regular",
    color: "#6B7280",
  },
  timelineItemDate: {
    fontSize: 12,
    fontFamily: "Manrope-Regular",
    color: "#9CA3AF",
  },
  chatSupportButton: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatSupportLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chatIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  chatIconText: {
    fontSize: 18,
  },
  chatSupportText: {
    fontSize: 16,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
  },
  TicketDetailsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    marginBottom: 0,
  },
  TicketDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
  TicketDetailsText: {
    fontSize: 16,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
  },
  TicketDetailsMainContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 5,
    borderBottomRightRadius: 5,
    padding: 20,
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  TicketDetailsMainItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  TicketDetailsMainText: {
    fontSize: 14,
    fontFamily: "Manrope-SemiBold",
    color: COLORS.primaryFontColor,
    flex: 1,
  },
  TicketDetailsMainTextValue: {
    fontSize: 14,
    fontFamily: "Manrope-Regular",
    color: COLORS.primaryFontColor,
    flex: 1,
    textAlign: "right",
  },
});