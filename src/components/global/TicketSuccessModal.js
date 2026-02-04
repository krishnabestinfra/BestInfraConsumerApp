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
          <Text style={styles.title}>Ticket Submitted Successfully!</Text>
          <Text style={styles.ticketNumber}>
            Your ticket number is {displayNumber}
          </Text>
          <Text style={styles.subtext}>You will receive Email/SMS shortly</Text>
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
              <Text style={styles.returnLinkText}>Return to Home</Text>
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
    paddingVertical: 28,
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
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primaryFontColor,
    textAlign: "center",
    marginBottom: 12,
  },
  ticketNumber: {
    fontSize: 15,
    color: COLORS.primaryFontColor,
    textAlign: "center",
    marginBottom: 6,
  },
  subtext: {
    fontSize: 14,
    color: COLORS.primaryFontColor,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.9,
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
    color: COLORS.primaryColor,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
});

export default TicketSuccessModal;
