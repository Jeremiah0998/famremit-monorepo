"use client";

import * as React from "react";
// We import directly from react-native, which our next.config.js will alias to react-native-web
import { TouchableOpacity, Text, StyleSheet } from "react-native";

export interface ButtonProps {
  text: string;
  onPress: () => void;
}

export const Button = ({ text, onPress }: ButtonProps) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>{text}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#00A859", // Our primary color
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});