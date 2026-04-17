import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { T } from '../constants/theme';

// Demo credentials — any non-empty values work; OP-441 shows the default officer ID
const DEMO_OFFICER_ID = 'OP-441';
const DEMO_PIN = '1234';

/**
 * LoginScreen
 * Shown as the first screen (LOGIN state). Validates officer ID + PIN,
 * then calls onLogin() to advance to OFF_DUTY.
 */
export default function LoginScreen({ onLogin }) {
  const [officerId, setOfficerId] = useState(DEMO_OFFICER_ID);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = () => {
    if (!officerId.trim() || !pin.trim()) {
      setError('Officer ID and PIN are required.');
      return;
    }
    setError('');
    setLoading(true);
    // 800 ms simulated auth delay — replace with real API call when ready
    setTimeout(() => {
      setLoading(false);
      onLogin(officerId.trim());
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        {/* Branding */}
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>CIVIX</Text>
          <View style={styles.brandDot} />
        </View>
        <Text style={styles.brandSub}>COMMAND CENTER</Text>
        <Text style={styles.heading}>Field Officer Login</Text>

        {/* Officer ID */}
        <Text style={styles.label}>Officer ID</Text>
        <TextInput
          style={styles.input}
          value={officerId}
          onChangeText={setOfficerId}
          autoCapitalize="characters"
          placeholder="e.g. OP-441"
          placeholderTextColor={T.textSecondary}
          returnKeyType="next"
        />

        {/* PIN */}
        <Text style={styles.label}>Secure PIN</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          placeholder="••••"
          placeholderTextColor={T.textSecondary}
          keyboardType="numeric"
          maxLength={8}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Primary Action */}
        <TouchableOpacity
          style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={T.white} />
          ) : (
            <Text style={styles.loginBtnText}>SECURE LOGIN</Text>
          )}
        </TouchableOpacity>

        {/* Hint for demo */}
        <Text style={styles.hint}>Demo: Use any Officer ID + any PIN</Text>

        <Text style={styles.footnote}>
          Restricted Government Access Only. Activity is logged.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: T.pad,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: T.card,
    borderRadius: T.radius,
    padding: 32,
    ...T.shadowLG,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: T.text,
    letterSpacing: 4,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.accent,
    marginLeft: 4,
    marginTop: 2,
  },
  brandSub: {
    fontSize: T.fontXS,
    fontWeight: '600',
    color: T.textSecondary,
    letterSpacing: 3,
    marginBottom: 20,
  },
  heading: {
    fontSize: T.fontLG,
    fontWeight: '700',
    color: T.text,
    marginBottom: 28,
  },
  label: {
    fontSize: T.fontSM,
    fontWeight: '600',
    color: T.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: T.radiusSM,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: T.fontMD,
    color: T.text,
    marginBottom: 18,
    backgroundColor: '#FAFAFA',
  },
  errorText: {
    color: T.danger,
    fontSize: T.fontSM,
    marginBottom: 12,
    fontWeight: '500',
  },
  loginBtn: {
    backgroundColor: T.accent,
    borderRadius: T.radiusSM,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    ...T.shadow,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: T.white,
    fontSize: T.fontMD,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  hint: {
    textAlign: 'center',
    fontSize: T.fontXS,
    color: T.textSecondary,
    marginTop: 14,
  },
  footnote: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 24,
  },
});
