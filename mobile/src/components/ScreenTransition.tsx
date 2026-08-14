/**
 * ScreenTransition.tsx
 *
 * Wraps any screen in a slide-in / fade-in animation.
 * direction: "right" = slide from right (push forward)
 *            "left"  = slide from left  (back)
 *            "up"    = slide from bottom (modal)
 *            "none"  = cross-fade only
 */
import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

type Direction = "right" | "left" | "up" | "none";

interface Props {
  children: React.ReactNode;
  direction?: Direction;
  /** Unique key — change this to re-trigger the animation */
  animKey: string;
}

export function ScreenTransition({ children, direction = "right", animKey }: Props) {
  const translateX = useRef(new Animated.Value(direction === "right" ? 340 : direction === "left" ? -340 : 0)).current;
  const translateY = useRef(new Animated.Value(direction === "up" ? 500 : 0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Reset
    translateX.setValue(direction === "right" ? 340 : direction === "left" ? -340 : 0);
    translateY.setValue(direction === "up" ? 500 : 0);
    opacity.setValue(0);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 340,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ translateX }, { translateY }], opacity },
      ]}
    >
      {children}
    </Animated.View>
  );
}
