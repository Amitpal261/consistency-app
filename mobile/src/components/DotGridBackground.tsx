import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, Pattern, Rect, Circle } from "react-native-svg";

export default function DotGridBackground() {
  return (
    <View pointerEvents="none" style={styles.container}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id="dot-grid" width={24} height={24} patternUnits="userSpaceOnUse">
            <Circle cx={12} cy={12} r={1} fill="rgba(255,255,255,0.05)" />
          </Pattern>
        </Defs>
        <Rect x={0} y={0} width="100%" height="100%" fill="url(#dot-grid)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: -1,
  },
});
