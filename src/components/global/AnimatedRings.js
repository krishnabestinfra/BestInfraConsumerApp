import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { Easing } from 'react-native-reanimated';

const RING_COUNT = 8;
const RING_DELAY = 600;
const ANIMATION_DURATION = 4000;

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

const AnimatedRings = ({ style, paused = false }) => {
  const progress = useSharedValue(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const loopAnimation = useCallback(() => {
    if (pausedRef.current) return;
    progress.value = 0;
    progress.value = withTiming(
      RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION,
      {
        duration: RING_DELAY * (RING_COUNT - 1) + ANIMATION_DURATION,
        easing: Easing.inOut(Easing.ease),
      },
      () => runOnJS(loopAnimation)()
    );
  }, [progress]);

  useEffect(() => {
    if (paused) {
      cancelAnimation(progress);
      progress.value = 0;
    } else {
      loopAnimation();
    }
  }, [paused, loopAnimation, progress]);

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: RING_COUNT }).map((_, index) => (
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
    zIndex: 0,
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
