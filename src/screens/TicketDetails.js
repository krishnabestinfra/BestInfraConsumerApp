import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "../constants/colors";
import React, { useEffect, useState } from "react";
import Menu from "../../assets/icons/bars.svg";
import Notification from "../../assets/icons/notification.svg";
import CheckCircle from "../../assets/icons/checkmark.svg";
import ChevronRight from "../../assets/icons/rightArrow.svg";
import ChatIcon from "../../assets/icons/chatIcon.svg";
import TimelineCheckBlue from "../../assets/icons/timeLineCheckBlue.svg";
import TimelineCheckGreen from "../../assets/icons/timeLineCheckGreen.svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { Easing } from "react-native-reanimated";
import { getUser } from "../utils/storage";
import Logo from "../components/global/Logo";
import TicketChatBox from "../components/TicketChatBox";
import DropdownIcon from "../../assets/icons/dropDown.svg";
import { apiClient } from "../services/apiClient";
import BottomNavigation from "../components/global/BottomNavigation";

const { width } = Dimensions.get("window");

const RING_COUNT = 20;
const RING_DELAY = 800;
const ANIMATION_DURATION = 5000;

const Ring = ({ index, progress }) => {
  const ringStyle = useAnimatedStyle(() => {
    const delay = index * RING_DELAY;
    const localProgress =
      Math.max(0, progress.value - delay) / ANIMATION_DURATION;
    const clamped = Math.min(localProgress, 1);

    return {
      opacity: interpolate(clamped, [0, 0.1, 1], [0, 0.6, 0]),
      transform: [
        {
          scale: interpolate(clamped, [0, 1], [0.4, 4]),
        },
      ],
    };
  });

  return <Animated.View style={[styles.ring, ringStyle]} />;
};

// Format ISO date to "DD/MM/YYYY, hh:mm A" (works in React Native)
const formatTicketDate = (isoString) => {
  if (isoString == null || isoString === "") return "—";
  const str = String(isoString).trim();
  if (!str) return "—";
  try {
    const date = new Date(str);
    if (Number.isNaN(date.getTime())) return str; // show raw if invalid
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const hour12 = hours % 12 || 12;
    return `${day}/${month}/${year}, ${hour12}:${minutes} ${ampm}`;
  } catch {
    return str;
  }
};

const TicketDetails = ({ navigation, route }) => {
  const progress = useSharedValue(0);
  const [userName, setUserName] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get ticket data from navigation params (API expects numeric id only)
  const { ticketId, ticketData, category, status } = route?.params || {};
  const rawId = ticketData?.id ?? ticketId;
  const ticketIdForApi =
    rawId != null && !Number.isNaN(Number(rawId)) ? Number(rawId) : null;


  const loopAnimation = () => {
    progress.value = 0;
    progress.value = withTiming(
      RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION,
      {
        duration: RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION,
        easing: Easing.inOut(Easing.ease),
      },
      () => runOnJS(loopAnimation)()
    );
  };

  useEffect(() => {
    loopAnimation();
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      if (user) {
        setUserName(user.name);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    (async () => {
      const user = await getUser();
    })();
  }, []);

  // Fetch ticket details from API
  useEffect(() => {
    if (!ticketIdForApi) {
      setDetails(ticketData ?? null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await apiClient.getTicketDetails(ticketIdForApi);
        if (!cancelled && result?.success && result?.data) {
          setDetails(result.data);
        } else if (!cancelled && ticketData) {
          setDetails(ticketData);
        }
      } catch (err) {
        if (!cancelled && ticketData) setDetails(ticketData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ticketIdForApi]);

  const display = details ?? ticketData;
  const priority = display?.priority ?? ticketData?.priority ?? category;

  const timelineData = Array.isArray(display?.timeline)
    ? display.timeline
    : Array.isArray(display?.history)
      ? display.history
      : [];

  const handleChatSupport = () => {
    navigation.navigate("ChatSupport", {
      ticketId: rawId ?? ticketId,
      ticketData: display ?? ticketData,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Menu width={18} height={18} fill="#202d59" />
        </Pressable>

        <View style={styles.logoWrapper}>
          {Array.from({ length: RING_COUNT }).map((_, index) => (
            <Ring key={index} index={index} progress={progress} />
          ))}
          <Logo variant="blue" size="medium" />
        </View>

        <View style={styles.headerRightContainer}>
          <Pressable
            style={styles.headerButton}
            onPress={() => navigation.navigate("Profile")}
          >
            <Notification width={18} height={18} fill="#202d59" />
          </Pressable>
          {/* Priority Badge */}
          <View style={[
            styles.priorityBadge,
            (priority?.toLowerCase?.() ?? 'high') === 'low' && styles.priorityBadgeLow,
            (priority?.toLowerCase?.() ?? 'high') === 'medium' && styles.priorityBadgeMedium,
          ]}>
            <Text style={styles.priorityBadgeText}>
              {priority || "High"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.TicketDetailsContainer}>
            <TouchableOpacity 
              style={styles.TicketDetailsHeader} 
              onPress={() => setIsExpanded(!isExpanded)}
              activeOpacity={0.7}
            >
              <Text style={styles.TicketDetailsText}>Ticket Details</Text>
              <DropdownIcon
                width={14}
                height={14}
                style={{
                  marginLeft: 8,
                  transform: [{ rotate: isExpanded ? "180deg" : "0deg" }],
                }}
              />
            </TouchableOpacity>
              {isExpanded && (
          <View style={styles.TicketDetailsMainContainer}>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Ticket ID</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                {loading ? "…" : (display?.ticketNumber ?? ticketId ?? "—")}
              </Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Category</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                {loading ? "…" : (display?.category ?? category ?? "—")}
              </Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Status</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                {loading ? "…" : (display?.status ?? status ?? "—")}
              </Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Created On</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                {loading ? "…" : formatTicketDate(details?.createdAt ?? display?.createdAt ?? display?.createdOn) || "—"}
              </Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Last Updated</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                {loading ? "…" : formatTicketDate(details?.updatedAt ?? display?.updatedAt ?? display?.updatedOn ?? display?.lastUpdated) || "—"}
              </Text>
            </View>
            <View style={styles.TicketDetailsMainItem}>
              <Text style={styles.TicketDetailsMainText}>Assigned To</Text>
              <Text style={styles.TicketDetailsMainTextValue}>
                {loading ? "…" : (display?.assignedTo ?? "—")}
              </Text>
            </View>
          </View>
        )}

        {/* Ticket Timeline Section */}
        <Text style={styles.timelineTitle}>Ticket Timeline</Text>

        <View style={styles.timelineCard}>
          {timelineData.map((item, index) => (
            <View key={item.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={styles.timelineIcon}>
                  {item.resolved ? (
                    <TimelineCheckGreen width={16} height={16} />
                  ) : item.completed ? (
                    <TimelineCheckBlue width={16} height={16} />
                  ) : (
                    <View style={styles.timelineIconPending} />
                  )}
                </View>
                {index < timelineData.length - 1 && (
                  <View style={[
                    styles.timelineLine,
                    item.completed && styles.timelineLineCompleted
                  ]} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineItemTitle}>{item.title}</Text>
                <Text style={styles.timelineItemDescription}>{item.description}</Text>
                <Text style={styles.timelineItemDate}>{item.date}</Text>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 75,
    paddingBottom: 20,
    paddingHorizontal: 30,
    position: "relative",
  },
  headerRightContainer: {
    position: "relative",
    alignItems: "flex-end",
  },
  priorityBadge: {
    position: "absolute",
    top: 40,
    right: 0,
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  priorityBadgeLow: {
    backgroundColor: "#10B981",
  },
  priorityBadgeMedium: {
    backgroundColor: "#F59E0B",
  },
  priorityBadgeText: {
    fontSize: 10,
    fontFamily: "Manrope-SemiBold",
    color: "#FFFFFF",
    textTransform: "capitalize",
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: "center",    
    justifyContent: "center",
    elevation: 5,
    zIndex: 2,
  },  logo: {
    width: 80,
    height: 80,
    zIndex: 1,
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
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ring: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: "#BABECC66",
    opacity: 0.2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 30,
    paddingBottom: 180, // Space for bottom navigation
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
    minHeight: 80,
  },
  timelineLeft: {
    alignItems: "center",
    width: 40,
    gap: 4,
  },
  timelineIcon: {
    width: 28,
    height: 28,
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
    paddingBottom: 16,
    gap: 2,
  },
  timelineItemTitle: {
    fontSize: 14,
    fontFamily: "Manrope-Bold",
    color: COLORS.primaryFontColor,
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
  headerButton: {
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
});
