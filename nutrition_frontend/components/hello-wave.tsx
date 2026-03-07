import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, interpolate, Extrapolate } from 'react-native-reanimated';
import { useEffect } from 'react';

export function HelloWave() {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(1, { duration: 300 }),
      4,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      rotation.value,
      [0, 1],
      [0, 25],
      Extrapolate.CLAMP
    );
    return {
      transform: [{ rotate: `${rotate}deg` }],
    };
  });

  return (
    <Animated.Text
      style={[
        {
          fontSize: 28,
          lineHeight: 32,
          marginTop: -6,
        },
        animatedStyle,
      ]}>
      👋
    </Animated.Text>
  );
}
