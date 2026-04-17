import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

/**
 * PhoneFrame
 * On native (iOS/Android): renders children directly — no wrapper overhead.
 * On web: wraps children in a centered phone chrome for presentation demos.
 * Fixed 390×844 dimensions — fits any laptop screen without transform hacks.
 */

const PHONE_W = 390;
const PHONE_H = 844;

export default function PhoneFrame({ children }) {
  // On a real device just render directly
  if (Platform.OS !== 'web') return <>{children}</>;

  return (
    <View style={styles.browser}>
      {/* Phone chassis */}
      <View style={styles.chassis}>
        {/* Dynamic island / notch */}
        <View style={styles.notch} />

        {/* App content */}
        <View style={styles.screen}>{children}</View>

        {/* Home indicator pill */}
        <View style={styles.homeIndicator} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  browser: {
    flex: 1,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chassis: {
    width: PHONE_W,
    height: PHONE_H,
    backgroundColor: '#1C1C1E',
    borderRadius: 52,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.55,
    shadowRadius: 48,
    elevation: 24,
  },
  notch: {
    width: 120,
    height: 30,
    backgroundColor: '#1C1C1E',
    borderRadius: 15,
    zIndex: 10,
    marginBottom: 4,
  },
  screen: {
    flex: 1,
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 40,
    overflow: 'hidden',
  },
  homeIndicator: {
    width: 120,
    height: 5,
    backgroundColor: '#636366',
    borderRadius: 3,
    marginTop: 8,
  },
});
