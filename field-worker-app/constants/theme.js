/**
 * T — Global design tokens for the Civix Field Worker App
 * Imported by all screens to prevent circular dependencies with App.js
 */
export const T = {
  // Colors
  bg: '#F9FAFB',          // App background
  card: '#FFFFFF',        // Card background
  border: '#E5E7EB',      // Subtle borders
  text: '#111827',        // Primary text
  textSecondary: '#6B7280', // Secondary / muted text
  accent: '#2563EB',      // Primary blue action
  success: '#10B981',     // Green / success / on-duty
  danger: '#EF4444',      // Red / critical / off-duty
  warning: '#F59E0B',     // Amber / high-priority
  white: '#FFFFFF',

  // Typography
  fontXL: 28,
  fontLG: 22,
  fontMD: 17,
  fontSM: 14,
  fontXS: 12,

  // Spacing
  pad: 20,
  padSM: 12,
  radius: 16,
  radiusSM: 10,

  // Shadows
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shadowLG: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};
