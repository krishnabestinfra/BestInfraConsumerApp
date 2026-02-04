import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../constants/colors';
import CheckmarkIcon from '../../../assets/icons/checkmark.svg';

const { width } = Dimensions.get('window');

const TicketSuccessModal = ({
  visible,
  ticketNumber,
  onViewDetails,
  onReturnHome,
}) => {
  const displayNumber = ticketNumber || '—';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onReturnHome}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconWrapper}>
            <CheckmarkIcon width={72} height={72} />
          </View>
          <Text style={styles.title}>Ticket Submitted Successfully!</Text>
          <Text style={styles.detail}>
            Your ticket number is #{displayNumber}
          </Text>
          <Text style={styles.detail}>You will receive Email/SMS shortly</Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onViewDetails}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>View Ticket Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={onReturnHome}
            activeOpacity={0.7}
          >
            <Text style={styles.linkText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: Math.min(width - 48, 400),
    backgroundColor: '#f0f8f4',
    borderRadius: 12,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  iconWrapper: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryFontColor,
    textAlign: 'center',
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    color: COLORS.primaryFontColor,
    textAlign: 'center',
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#66BB6A',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  linkText: {
    color: '#1E88E5',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});

export default TicketSuccessModal;
