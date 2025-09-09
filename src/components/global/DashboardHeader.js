import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { COLORS } from '../../constants/colors';
import GlobeShield from '../../../assets/icons/globe-shield.svg';
import RechargeIcon from '../../../assets/icons/recharge.svg';
import InvoicesIcon from '../../../assets/icons/invoices.svg';
import TicketsIcon from '../../../assets/icons/tickets.svg';
import UsageIcon from '../../../assets/icons/usage.svg';
import Hand from '../../../assets/icons/hand.svg';
import Arrow from '../../../assets/icons/arrow.svg';
import Plus from '../../../assets/icons/plus.svg';
import Menu from '../../../assets/icons/bars.svg';
import Notification from '../../../assets/icons/notification.svg';
import { getUser } from '../../utils/storage';
import Logo from './Logo';
import AnimatedRings from './AnimatedRings';

const DashboardHeader = ({ 
  navigation, 
  showRings = true,
  variant = 'default' // 'default', 'payments', 'tickets'
}) => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUser();
      if (user) {
        setUserName(user.name);
      }
    };
    loadUser();
  }, []);

  const getActiveIcon = () => {
    switch (variant) {
      case 'payments':
        return 'recharge';
      case 'tickets':
        return 'tickets';
      case 'usage':
        return 'usage';
      default:
        return 'recharge';
    }
  };

  const activeIcon = getActiveIcon();

  return (
    <View style={styles.bluecontainer}>
      <View style={styles.TopMenu}>
        <Pressable
          style={styles.barsIcon}
          onPress={() => navigation.navigate('SideMenu')}
        >
          <Menu width={18} height={18} fill="#202d59" />
        </Pressable>
        
        <View style={styles.logoWrapper}>
          {showRings && <AnimatedRings />}
          <Logo variant="blue" size="medium" />
        </View>
        
        <Pressable
          style={styles.bellIcon}
          onPress={() => navigation.navigate('Profile')}
        >
          <Notification width={18} height={18} fill="#202d59" />
        </Pressable>
      </View>
      
      <View style={styles.ProfileBox}>
        <View>
          <View style={styles.greetingContainer}>
            <Text style={styles.hiText}>Hi, {userName} </Text>
            <Hand width={30} height={30} fill="#55B56C" />
          </View>
          <Text style={styles.stayingText}>Staying efficient today?</Text>
        </View>
        <View>
          <Text style={styles.balanceText}>Balance</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.amountText}>₹1,245</Text>
            <View style={styles.plusBox}>
              <Plus width={20} height={20} fill="#55B56C" />
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.amountSection}>
        <View style={styles.amountContainer}>
          <Text style={styles.dueText}>Due Amount: ₹3,180</Text>
          <Text style={styles.dateText}>This Month</Text>
        </View>
        <View style={styles.greenBox}>
          <View style={styles.payInfoContainer}>
            <GlobeShield
              width={25}
              height={25}
              fill="#55b56c"
              style={styles.shieldIcon}
            />
            <View>
              <Text style={styles.payText}>Pay securely</Text>
              <Text style={styles.tostayText}>to stay on track.</Text>
              <Text style={styles.avoidText}>Avoid service disruption.</Text>
            </View>
          </View>
          <View style={styles.paynowbox}>
            <Text style={styles.paynowText}>Pay Now</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.iconsContainer}>
        <View style={styles.individualBox}>
          <View style={[
            styles.iconBox,
            activeIcon === 'recharge' && styles.iconBoxActive
          ]}>
            <RechargeIcon width={18} height={18} fill="#55B56C" />
          </View>
          <Text style={styles.iconText}>Recharge</Text>
        </View>
        <View style={styles.individualBox}>
          <View style={[
            styles.iconBox,
            activeIcon === 'invoices' && styles.iconBoxActive
          ]}>
            <InvoicesIcon width={20} height={20} fill="#55B56C" />
          </View>
          <Text style={styles.iconText}>Invoices</Text>
        </View>
        <View style={styles.individualBox}>
          <View style={[
            styles.iconBox,
            activeIcon === 'tickets' && styles.iconBoxActive
          ]}>
            <TicketsIcon width={20} height={20} fill="#55B56C" />
          </View>
          <Text style={styles.iconText}>Tickets</Text>
        </View>
        <View style={styles.individualBox}>
          <View style={[
            styles.iconBox,
            activeIcon === 'usage' && styles.iconBoxActive
          ]}>
            <UsageIcon width={20} height={20} fill="#55B56C" />
          </View>
          <Text style={styles.iconText}>Usage</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bluecontainer: {
    backgroundColor: '#eef8f0',
    padding: 15,
  },
  TopMenu: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 15,
  },
  barsIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: 'center',
    verticalAlign: 'middle',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 2,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellIcon: {
    backgroundColor: COLORS.secondaryFontColor,
    width: 54,
    height: 54,
    borderRadius: 60,
    alignItems: 'center',
    verticalAlign: 'middle',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 2,
  },
  ProfileBox: {
    display: 'flex',
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginHorizontal: 4,
  },
  greetingContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hiText: {
    color: COLORS.primaryFontColor,
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
  },
  stayingText: {
    color: COLORS.primaryFontColor,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
  },
  balanceText: {
    color: COLORS.primaryFontColor,
    marginLeft: 20,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
  },
  balanceContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    justifyContent: 'center',
  },
  amountText: {
    color: COLORS.primaryColor,
    fontSize: 20,
    fontFamily: 'Manrope-Bold',
  },
  plusBox: {
    marginLeft: 7,
  },
  amountSection: {
    marginTop: 20,
  },
  amountContainer: {
    backgroundColor: COLORS.primaryColor,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  dueText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
  },
  dateText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
  },
  greenBox: {
    display: 'flex',
    flexDirection: 'row',
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    alignItems: 'center',
    padding: 10,
    marginTop: 3,
  },
  payInfoContainer: {
    display: 'flex',
    flexDirection: 'row',
  },
  shieldIcon: {
    marginHorizontal: 12,
    marginTop: 6,
  },
  payText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
  tostayText: {
    color: COLORS.secondaryFontColor,
    fontSize: 16,
    fontFamily: 'Manrope-Bold',
  },
  avoidText: {
    color: COLORS.secondaryFontColor,
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
  },
  paynowbox: {
    backgroundColor: COLORS.secondaryFontColor,
    height: 35,
    width: 95,
    borderRadius: 5,
    display: 'flex',
    justifyContent: 'center',
  },
  paynowText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  iconsContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 15,
  },
  individualBox: {
    alignItems: 'center',
    width: 85,
  },
  iconBox: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
    marginTop: 5,
  },
});

export default DashboardHeader;
