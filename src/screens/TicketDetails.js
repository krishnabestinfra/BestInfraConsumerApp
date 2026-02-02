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

const TicketDetails = ({ navigation, route }) => {
  const progress = useSharedValue(0);
  const [userName, setUserName] = useState("");

  // Get ticket data from navigation params
  const { ticketId, ticketData, category, status } = route?.params || {};

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

        <Pressable
          style={styles.headerButton}
          onPress={() => navigation.navigate("Profile")}
        >
          <Notification width={18} height={18} fill="#202d59" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Ticket Details Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Ticket Details</Text>
          <View style={[styles.priorityBadge, getPriorityStyle(ticketData?.priority || "High")]}>
            <Text style={styles.priorityText}>
              {ticketData?.priority || "High"}
            </Text>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Ticket ID</Text>
              <Text style={styles.detailValue}>
                #{ticketData?.ticketNumber || ticketId || "298"}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>
                {ticketData?.category || category || "Connection Issue"}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>
                {ticketData?.status || status || "Open"}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Created On</Text>
              <Text style={styles.detailValue}>
                {ticketData?.createdOn || "08/17/2025, 04:04 PM"}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Last Updated</Text>
              <Text style={styles.detailValue}>
                {ticketData?.lastUpdated || ticketData?.updatedOn || "17/08/2025, 04:04 PM"}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Assigned to</Text>
              <Text style={styles.detailValue}>
                {ticketData?.assignedTo || "BI-Tech Team"}
              </Text>
            </View>
          </View>
        </View>

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
      </ScrollView>
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
    paddingBottom: 40,
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
});
