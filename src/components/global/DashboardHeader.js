import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Image } from 'react-native';
import { COLORS } from '../../constants/colors';
import GlobeShield from '../../../assets/icons/globe-shield.svg';
import RechargeIcon from '../../../assets/icons/recharge.svg';
import InvoicesIcon from '../../../assets/icons/invoices.svg';
import TicketsIcon from '../../../assets/icons/tickets.svg';
import UsageIcon from '../../../assets/icons/usage.svg';
// White icons for active states
import ActiveRechargeIcon from '../../../assets/icons/activePayments.svg';
import ActiveTicketsIcon from '../../../assets/icons/ticketsWhite.svg';
import ActiveInvoiceIcon from '../../../assets/icons/activeInvoice.svg';
import ActiveUsageIcon from '../../../assets/icons/activeUsageIcon.svg';
import Hand from '../../../assets/icons/hand.svg';
import Arrow from '../../../assets/icons/arrow.svg';
import Plus from '../../../assets/icons/plus.svg';
import Menu from '../../../assets/icons/bars.svg';
import WalletActive from '../../../assets/icons/wallet.svg';
import Notification from '../../../assets/icons/notification.svg';
import { getUser, getConsumerDisplayName, cleanupStoredUserData } from '../../utils/storage';
import { getCachedConsumerData, backgroundSyncConsumerData } from '../../utils/cacheManager';
import { cacheManager } from '../../utils/cacheManager';
import { useLoading } from '../../utils/loadingManager';
import { useNotifications } from '../../context/NotificationsContext';
import Logo from './Logo';
import AnimatedRings from './AnimatedRings';

const DashboardHeader = React.memo(({ 
  navigation, 
  showRings = true,
  variant = 'default', // 'default', 'payments', 'tickets', 'usage', 'invoices'
  showBalance = true, // Control balance section visibility
  consumerData = null, // API consumer data
  isLoading = false // Loading state
}) => {
  const [userName, setUserName] = useState('');
  const [cachedConsumerData, setCachedConsumerData] = useState(null);
  const { isLoading: isUserLoading, setLoading: setUserLoading } = useLoading('user_loading', true);

    const getGreeting = () => {
    const hour = new Date().getHours(); // 0-23
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  
  // Helper function to format amount
  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return "₹0.00";
    return `₹${Math.abs(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };
  
  // Get notification data from context
  const { unreadCount, isLoading: isNotificationsLoading } = useNotifications();


  useEffect(() => {
    const loadUser = async () => {
      try {
        setUserLoading(true);
        // Clean up any stored UIDs in user data
        await cleanupStoredUserData();
        const user = await getUser();
        
        if (user && user.identifier) {
          // Check preloaded data first (ultra-fast)
          const preloadedData = await cacheManager.getCachedData('consumer_data', user.identifier);
          if (preloadedData.success) {
            setCachedConsumerData(preloadedData.data);
            setUserName(preloadedData.data.name || user.name || 'Consumer');
            setUserLoading(false, 50); // Minimum 50ms loading time
            console.log('⚡ DashboardHeader: Using preloaded data');
          } else {
            // Try cached data
            const cachedResult = await getCachedConsumerData(user.identifier);
            if (cachedResult.success) {
              setCachedConsumerData(cachedResult.data);
              setUserName(cachedResult.data.name || user.name || 'Consumer');
              setUserLoading(false, 100);
              console.log('⚡ DashboardHeader: Using cached data');
            } else if (user.name) {
              setUserName(user.name);
              setUserLoading(false, 50);
            }
          }
          
          // Background sync to get fresh data
          backgroundSyncConsumerData(user.identifier).then((result) => {
            if (result.success) {
              setCachedConsumerData(result.data);
              setUserName(result.data.name || user.name || 'Consumer');
            }
          }).catch(error => {
            console.error('Background sync failed:', error);
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setUserLoading(false, 50);
      }
    };
    loadUser();
  }, [setUserLoading]);

  // Refresh user data when consumerData changes
  useEffect(() => {
    if (consumerData && consumerData.name) {
      setUserName(consumerData.name);
    }
  }, [consumerData]);

  // Get the display name with proper fallback logic - memoized for performance
  const getDisplayName = useCallback(() => {
    // Use cached data first, then API data, then stored name
    const dataSource = cachedConsumerData || consumerData;
    return getConsumerDisplayName(dataSource, userName, isLoading || isUserLoading);
  }, [cachedConsumerData, consumerData, userName, isLoading, isUserLoading]);

  // Navigation configuration - memoized for performance
  const navigationItems = useMemo(() => [
    {
      key: 'payments',
      label: 'Recharge',
      route: 'PostPaidRechargePayments',
      icon: RechargeIcon,
      activeIcon: WalletActive,
      iconSize: { width: 20, height: 20 }
    },
    {
      key: 'invoices',
      label: 'Invoices',
      route: 'Invoices',
      icon: InvoicesIcon,
      activeIcon: ActiveUsageIcon, // Use same icon for now
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
      key: 'usage',
      label: 'Usage',
      route: 'Usage',
      icon: UsageIcon,
      activeIcon:  ActiveInvoiceIcon,
      iconSize: { width: 20, height: 20 }
    }
  ], []);

  // Handle navigation press - memoized for performance
  const handleNavigationPress = useCallback((item) => {
    if (item.route) {
      // Use smooth navigation if available
      if (navigation.navigateSmoothly) {
        navigation.navigateSmoothly(item.route);
      } else {
        navigation.navigate(item.route);
      }
    }
  }, [navigation]);

  // Render individual navigation item - memoized for performance
  const renderNavigationItem = useCallback((item) => {
    const isActive = variant === item.key;
    const IconComponent = isActive ? item.activeIcon : item.icon;
    const iconColor = isActive ? COLORS.secondaryFontColor : '#55B56C';
    
    return (
      <Pressable 
        key={item.key}
        style={styles.individualBox}
        onPress={() => handleNavigationPress(item)}
      >
        <View style={[
          styles.iconBox,
          isActive && styles.iconBoxActive
        ]}>
          <IconComponent 
            width={item.iconSize.width} 
            height={item.iconSize.height} 
            fill={iconColor} 
          />
        </View>
        <Text style={styles.iconText}>
          {item.label}
        </Text>
      </Pressable>
    );
  }, [variant, handleNavigationPress]);

  return (
    <View style={styles.bluecontainer}>
      <View style={styles.TopMenu}>
        <Pressable
          style={styles.barsIcon}
          onPress={() => navigation.navigate('SideMenu')}
        >
          <Menu width={18} height={18} fill="#202d59" />
        </Pressable>
        
        <Pressable style={styles.logoWrapper} onPress={() => navigation.navigate('PostPaidDashboard')}>
          {showRings && <AnimatedRings />}
          <Logo variant="blue" size="medium" />
        </Pressable>
        
        <Pressable
          style={styles.bellWrapper}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.bellIcon}>
          <Notification width={18} height={18} fill="#202d59" />
          </View>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
      
      <View style={styles.ProfileBox}>
        <View>
          <Image 
            source={require('../../../assets/images/gmr.png')} 
            style={styles.gmrLogo}
            resizeMode="contain"
          />
          <View style={styles.greetingContainer}>
            <Text style={styles.hiText}>
              Hi, {getGreeting()}
              {/* {getDisplayName()} */}{" "}
            </Text>
            <Hand width={30} height={30} fill="#55B56C" />
          </View>
          <Text style={styles.stayingText}>Staying efficient today?</Text>
        </View>

        {/* Conditionally render balance section */}
        {showBalance && (
          <View>
            <Text style={styles.balanceText}>Balance</Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.amountText}>
                {isLoading ? "Loading..." : formatAmount((cachedConsumerData || consumerData)?.totalOutstanding)}
              </Text>
              <View style={styles.plusBox}>
                <Plus width={20} height={20} fill="#55B56C" />
              </View>
            </View>
          </View>
        )}

      </View>
      
      <View style={styles.amountSection}>
        <View style={styles.amountContainer}>
          <Text style={styles.dueText}>
            Due Amount: {isLoading ? "Loading..." : formatAmount((cachedConsumerData || consumerData)?.totalOutstanding)}
          </Text>
          {/* <Text style={styles.dateText}>This Month</Text> */}
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
          <Pressable style={styles.paynowbox} onPress={() => navigation.navigate('PostPaidRechargePayments')}>
            <Text style={styles.paynowText}>Pay Now</Text>
          </Pressable>
        </View>
      </View>
      
      {/* Dynamic Navigation Container */}
      <View style={styles.iconsContainer}>
        {navigationItems.map(renderNavigationItem)}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bluecontainer: {
    backgroundColor: '#eef8f0',
    padding: 16,
  },
  TopMenu: {
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
    justifyContent: 'center',
    elevation: 5,
    zIndex: 2,
  },

  bellWrapper: {
  position: 'relative',
},
badge: {
  position: 'absolute',
  right: -3,
  top: -3,
  backgroundColor: 'red',
  width: 22,
  height: 22,
  borderRadius: 15,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#fff',
  zIndex: 2,
},
badgeText: {
  color: '#fff',
  fontSize: 10,
  fontFamily:'Manrope-Regular'
},

  ProfileBox: {
    justifyContent: 'space-between',
    flexDirection: 'row',
    marginHorizontal: 4,
  },
  gmrLogo: {
    width: 60,
    height: 60,
    marginBottom: 8,
    marginLeft: 10,
  },
  greetingContainer: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dueText: {
    color: COLORS.secondaryFontColor,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
  },
  dateText: {
    color: COLORS.secondaryFontColor,
    fontSize: 11,
    fontFamily: 'Manrope-Regular',
  },
  greenBox: {
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
    flexDirection: 'row',
  },
  shieldIcon: {
    marginHorizontal: 12,
    marginTop: 10,
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
    marginBottom:10,
  },
  paynowbox: {
    backgroundColor: COLORS.secondaryFontColor,
    height: 35,
    width: 95,
    borderRadius: 5,
    justifyContent: 'center',
    marginHorizontal:12,
    
  },
  paynowText: {
    color: COLORS.primaryFontColor,
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    textAlign: 'center',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 15,
  },
  individualBox: {
    alignItems: 'center',
    width: 85,
  },
  // Navigation Item Styles
  iconBox: {
    backgroundColor: COLORS.secondaryFontColor, // White background (inactive)
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: COLORS.secondaryColor, // Green background (active)
    borderRadius: 35,
    elevation: 1,
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: COLORS.primaryFontColor, // Dark text (inactive)
    fontSize: 10,
    fontFamily: 'Manrope-Regular',
    marginTop: 5,
  },
  iconTextActive: {
    color: COLORS.secondaryFontColor, // White text (active)
    fontFamily: 'Manrope-Bold',
  },
});

DashboardHeader.displayName = 'DashboardHeader';

export default DashboardHeader;
