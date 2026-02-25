import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { useTheme } from '../../context/ThemeContext';
import HomeIcon from '../../../assets/icons/HomeIcon.svg';
import HomeIconWhite from '../../../assets/icons/HomeIconWhite.svg';
import RechargeIcon from '../../../assets/icons/recharge.svg';
import InvoicesIcon from '../../../assets/icons/invoices.svg';
import TicketsIcon from '../../../assets/icons/tickets.svg';
import UsageIcon from '../../../assets/icons/usage.svg';
import WalletActive from '../../../assets/icons/wallet.svg';
import ActiveTicketsIcon from '../../../assets/icons/ticketsWhite.svg';
import ActiveInvoiceIcon from '../../../assets/icons/activeInvoice.svg';
import ActiveUsageIcon from '../../../assets/icons/activeUsageIcon.svg';

const BottomNavigation = ({ navigation }) => {
  const route = useRoute();
  const { isDark, colors: themeColors, getScaledFontSize } = useTheme();
  const s10 = getScaledFontSize(10);

  const navigationItems = useMemo(() => [
    {
      key: 'home',
      label: 'Home',
      route: 'PostPaidDashboard',
      icon: HomeIcon,
      activeIcon: HomeIconWhite,
      iconSize: { width: 20, height: 20 }
    },
    {
      key: 'payments',
      label: 'Recharge',
      route: 'PostPaidRechargePayments',
      icon: RechargeIcon,
      activeIcon: WalletActive,
      iconSize: { width: 20, height: 20 }
    },
    {
      key: 'usage',
      label: 'Usage',
      route: 'Usage',
      icon: UsageIcon,
      activeIcon: ActiveInvoiceIcon,
      iconSize: { width: 20, height: 20 }
    },
    {
      key: 'tickets',
      label: 'Tickets',
      route: 'Tickets',
      icon: TicketsIcon,
      activeIcon: ActiveTicketsIcon,
      iconSize: { width: 20, height: 20 }
    },
    
    {
      key: 'invoices',
      label: 'Invoices',
      route: 'Invoices',
      icon: InvoicesIcon,
      activeIcon: ActiveUsageIcon,
      iconSize: { width: 20, height: 20 }
    }
  ], []);

  const getActiveKey = useCallback(() => {
    const routeName = route.name;
    

    if (routeName === 'PostPaidDashboard') {
      return 'home';
    }
    if (routeName === 'PostPaidRechargePayments' || routeName === 'Payments') {
      return 'payments';
    }
    if (routeName === 'Invoices') {
      return 'invoices';
    }
    if (routeName === 'Reports') {
      return null; 
    }
    if (routeName === 'Tickets' || routeName === 'TicketDetails' || routeName === 'ChatSupport') {
      return 'tickets';
    }
    if (routeName === 'Usage') {
      return 'usage';
    }
    
    return null;
  }, [route.name]);


  const handleNavigationPress = useCallback((item) => {
    if (item.route && navigation) {

      if (navigation.navigateSmoothly) {
        navigation.navigateSmoothly(item.route);
      } else {
        navigation.navigate(item.route);
      }
    }
  }, [navigation]);

  const renderNavigationItem = useCallback((item) => {
    const activeKey = getActiveKey();
    const isActive = activeKey === item.key;
    const IconComponent = isActive ? item.activeIcon : item.icon;
    const iconColor = isDark
      ? '#FFFFFF' 
      : (isActive ? COLORS.secondaryFontColor : '#55B56C');

    return (
      <Pressable 
        key={item.key}
        style={styles.individualBox}
        onPress={() => handleNavigationPress(item)}
      >
        <View style={[
          styles.iconBox,
          isDark && { backgroundColor: themeColors.card },
          isActive && styles.iconBoxActive
        ]}>
          <IconComponent 
            width={item.iconSize.width} 
            height={item.iconSize.height} 
            fill={iconColor} 
          />
        </View>
        <Text style={[
          styles.iconText,
          { fontSize: s10 },
          isDark && !isActive && { color: themeColors.textSecondary },
          isActive && styles.iconTextActive,
          isActive && isDark && { color: themeColors.accent }
        ]}>
          {item.label}
        </Text>
      </Pressable>
    );
  }, [getActiveKey, handleNavigationPress, isDark, themeColors]);

  const containerBg = isDark ? themeColors.card : COLORS.secondaryFontColor;
  const borderColor = isDark ? themeColors.cardBorder : '#E5E7EB';
  const spacerBg = isDark ? themeColors.card : '#fff';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: containerBg, borderTopColor: borderColor }]}>
        <View style={styles.iconsContainer}>
          {navigationItems.map(renderNavigationItem)}
        </View>
      </View>
      {/* <View style={[styles.graySpacer, { backgroundColor: spacerBg }]} /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    backgroundColor: COLORS.secondaryFontColor,
    borderTopWidth: 0.2,
    borderTopColor: '#ddd',
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    // paddingTop: 4,
    // paddingBottom: 0,
  },
  graySpacer: {
    height: Platform.OS === 'ios' ? 24 : 20,
    backgroundColor: '#fff',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  individualBox: {
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    backgroundColor: COLORS.secondaryFontColor,
    borderRadius: 28,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconBoxActive: {
    backgroundColor: COLORS.secondaryColor,
    borderRadius: 28,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: COLORS.primaryFontColor,
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
    marginTop: 2,
  },
  iconTextActive: {
    color: COLORS.secondaryColor,
    fontFamily: 'Manrope-SemiBold',
  },
});

export default React.memo(BottomNavigation);
