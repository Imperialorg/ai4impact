/**
 * CameraScreen — Photo Verification
 * ====================================
 * Full-screen live camera for the VERIFICATION state.
 * On web (demo mode): shows a stylised placeholder with a "SIMULATE CAPTURE" button.
 *
 * Props:
 *   onCapture(base64String | null)  — called after capture; null on web demo
 *   onClose()                       — cancel without capturing
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { T } from '../constants/theme';

const IS_WEB = Platform.OS === 'web';

export default function CameraScreen({ onCapture, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    if (!IS_WEB && permission && !permission.granted) requestPermission();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleCapture = async () => {
    if (IS_WEB) {
      // Web demo: simulate capture with null (no real photo)
      onCapture(null);
      return;
    }
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: Platform.OS === 'android',
      });
      onCapture(`data:image/jpeg;base64,${photo.base64}`);
    } catch (err) {
      console.error('[CameraScreen] capture error:', err);
      setCapturing(false);
    }
  };

  // ── WEB DEMO MODE ─────────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <View style={s.webRoot}>
        <View style={s.webHeader}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.webBack}>← Back</Text>
          </TouchableOpacity>
          <View style={s.webBadge}>
            <Text style={s.webBadgeText}>📸  LIVE CAMERA</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        {/* Camera viewfinder placeholder */}
        <View style={s.webViewfinder}>
          <Text style={s.webVfIcon}>📷</Text>
          <Text style={s.webVfTitle}>Camera Unavailable on Web</Text>
          <Text style={s.webVfSub}>On a physical device, the live camera feed appears here.</Text>
          {/* Corner brackets for authenticity */}
          <View style={[s.corner, s.cornerTL]} />
          <View style={[s.corner, s.cornerTR]} />
          <View style={[s.corner, s.cornerBL]} />
          <View style={[s.corner, s.cornerBR]} />
        </View>

        <Text style={s.webInstruction}>
          Tap below to simulate capturing a live photo
        </Text>

        <TouchableOpacity style={s.webCaptureBtn} onPress={handleCapture} activeOpacity={0.85}>
          <Text style={s.webCaptureBtnText}>SIMULATE PHOTO CAPTURE</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── PERMISSION LOADING ────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={T.accent} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.permText}>Camera access required for verification.</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>GRANT ACCESS</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose} style={s.backLink}>
          <Text style={s.backLinkText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── NATIVE CAMERA ─────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />

      <View style={s.overlay}>
        {/* Header */}
        <View style={s.nativeHeader}>
          <View style={s.nativeBadge}>
            <Text style={s.nativeBadgeText}>📸  PHOTO VERIFICATION</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <Text style={s.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }} />

        <Text style={s.instruction}>
          Point at the resolved issue and capture a live photo
        </Text>

        {/* Shutter button */}
        <TouchableOpacity
          style={[s.captureBtn, capturing && s.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={capturing}
          activeOpacity={0.85}
        >
          {capturing
            ? <ActivityIndicator color={T.white} size="large" />
            : <View style={s.captureInner} />
          }
        </TouchableOpacity>
        <Text style={s.captureLabel}>
          {capturing ? 'Processing…' : 'Tap to capture'}
        </Text>
      </View>
    </View>
  );
}

const CORNER_SIZE = 20;
const CORNER_WIDTH = 3;

const s = StyleSheet.create({
  // ── Native camera ──────────────────────────────────────────────────────────
  root:              { flex: 1, backgroundColor: '#000' },
  overlay:           { flex: 1, paddingTop: 56, paddingBottom: 48, paddingHorizontal: T.pad },
  nativeHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  nativeBadge:       { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  nativeBadgeText:   { color: T.white, fontWeight: '700', fontSize: T.fontSM, letterSpacing: 0.5 },
  closeText:         { color: T.white, fontSize: 22, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  instruction:       { color: 'rgba(255,255,255,0.9)', fontSize: T.fontSM, textAlign: 'center', marginBottom: 24, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  captureBtn:        { width: 84, height: 84, borderRadius: 42, backgroundColor: T.white, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderWidth: 5, borderColor: 'rgba(255,255,255,0.5)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  captureBtnDisabled:{ opacity: 0.5 },
  captureInner:      { width: 60, height: 60, borderRadius: 30, backgroundColor: T.white, borderWidth: 2, borderColor: '#E5E7EB' },
  captureLabel:      { color: 'rgba(255,255,255,0.8)', fontSize: T.fontXS, textAlign: 'center', marginTop: 10, letterSpacing: 0.5 },
  // ── Permission screens ─────────────────────────────────────────────────────
  center:            { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: T.pad },
  permText:          { fontSize: T.fontMD, color: T.text, textAlign: 'center', marginBottom: 20 },
  permBtn:           { backgroundColor: T.accent, borderRadius: T.radiusSM, paddingVertical: 14, paddingHorizontal: 32 },
  permBtnText:       { color: T.white, fontWeight: '700', fontSize: T.fontMD, letterSpacing: 1 },
  backLink:          { marginTop: 20 },
  backLinkText:      { color: T.accent, fontSize: T.fontSM },
  // ── Web demo mode ─────────────────────────────────────────────────────────
  webRoot:           { flex: 1, backgroundColor: T.bg },
  webHeader:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: T.pad, paddingTop: 56, paddingBottom: 16 },
  webBack:           { fontSize: T.fontSM, fontWeight: '600', color: T.accent },
  webBadge:          { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: T.border },
  webBadgeText:      { fontSize: T.fontXS, fontWeight: '700', color: T.text },
  webViewfinder:     { flex: 1, backgroundColor: '#111827', marginHorizontal: T.pad, borderRadius: T.radius, alignItems: 'center', justifyContent: 'center', padding: T.pad, position: 'relative', overflow: 'hidden' },
  webVfIcon:         { fontSize: 48, marginBottom: 16 },
  webVfTitle:        { fontSize: T.fontMD, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  webVfSub:          { fontSize: T.fontSM, color: '#9CA3AF', textAlign: 'center' },
  // Viewfinder corner brackets
  corner:            { position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE, borderColor: T.accent },
  cornerTL:          { top: 12, left: 12, borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerTR:          { top: 12, right: 12, borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  cornerBL:          { bottom: 12, left: 12, borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH },
  cornerBR:          { bottom: 12, right: 12, borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH },
  webInstruction:    { fontSize: T.fontSM, color: T.textSecondary, textAlign: 'center', paddingHorizontal: T.pad, marginTop: 20, marginBottom: 16 },
  webCaptureBtn:     { backgroundColor: T.accent, marginHorizontal: T.pad, marginBottom: 40, borderRadius: T.radiusSM, paddingVertical: 18, alignItems: 'center', shadowColor: T.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  webCaptureBtnText: { color: T.white, fontWeight: '800', fontSize: T.fontMD, letterSpacing: 1.5 },
});
