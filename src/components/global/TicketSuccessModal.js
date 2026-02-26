import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { COLORS } from "../../constants/colors";
import { useTheme } from "../../context/ThemeContext";
import CheckmarkIcon from "../../../assets/icons/checkmark.svg";
import Button from "./Button";

const MODAL_GREEN = "#4CAF50";
const MODAL_BG = "#E8F5E9";

const TicketSuccessModal = ({
  visible,
  ticketNumber,
  ticketData,
  onViewDetails,
  onReturnHome,
}) => {
  const { getScaledFontSize } = useTheme();
  const s18 = getScaledFontSize(18);
  const s15 = getScaledFontSize(15);
  const s14 = getScaledFontSize(14);
  const displayNumber = ticketNumber
    ? (String(ticketNumber).startsWith("#") ? ticketNumber : `#${ticketNumber}`)
    : "#—";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onReturnHome}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onReturnHome}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.iconWrap}>
            <CheckmarkIcon width={64} height={64} />
          </View>
          <Text style={[styles.title, { fontSize: s18 }]}>Ticket Submitted Successfully!</Text>
          <Text style={[styles.ticketNumber, { fontSize: s15 }]}>
            Your ticket number is {displayNumber}
          </Text>
          <Text style={[styles.subtext, { fontSize: s14 }]}>You will receive Email/SMS shortly</Text>
          <View style={styles.actions}>
            <Button
              title="View Ticket Details"
              variant="primary"
              onPress={onViewDetails}
              style={styles.primaryButton}
              textStyle={styles.primaryButtonText}
            />
            <TouchableOpacity
              style={styles.returnLink}
              onPress={onReturnHome}
              activeOpacity={0.7}
            >
              <Text style={[styles.returnLinkText, { fontSize: s15 }]}>Return to Home</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    elevation: 999,
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: MODAL_BG,
    borderRadius: 16,
    paddingVertical: 50,
    paddingHorizontal: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrap: {
    marginBottom: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.primaryFontColor, // ✅ Primary
    textAlign: "center",
    marginBottom: 12,
  },
  ticketNumber: {
    fontSize: 15,
    color: "#707070", // ✅ Secondary
    textAlign: "center",
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: "#707070", // ✅ Secondary
    textAlign: "center",
    marginBottom: 40,
  },
  actions: {
    width: "100%",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: MODAL_GREEN,
    width: "100%",
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  returnLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  returnLinkText: {
    fontSize: 15,
    color: COLORS.primaryColor, // ✅ Action stays prominent
    fontWeight: "500",
  },
});

export default TicketSuccessModal;