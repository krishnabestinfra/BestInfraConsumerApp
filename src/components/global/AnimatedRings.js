import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
  withRepeat,
} from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const RING_COUNT = 3; // Optimized from 20 to 3
const RING_DELAY = 200;
const ANIMATION_DURATION = 2000;

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

const AnimatedRings = ({ 
  count = RING_COUNT, 
  delay = RING_DELAY, 
  duration = ANIMATION_DURATION,
  loop = true,
  style 
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (loop) {
      progress.value = withRepeat(
        withTiming(delay * (count - 1) + duration, {
          duration: delay * (count - 1) + duration,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    } else {
      progress.value = withTiming(
        delay * (count - 1) + duration,
        {
          duration: delay * (count - 1) + duration,
          easing: Easing.inOut(Easing.ease),
        },
        () => runOnJS(() => {})()
      );
    }
  }, [count, delay, duration, loop]);

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <Ring key={index} index={index} progress={progress} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 1,
    borderColor: '#BABECC66',
    opacity: 0.2,
  },
});

export default AnimatedRings;
