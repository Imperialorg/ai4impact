/**
 * EnRouteScreen.js — EN_ROUTE State
 * =====================================
 * Shown when officer has accepted an incident and is navigating to it.
 *
 * Key features:
 *  - Live GPS tracking via expo-location watchPositionAsync (3 s interval)
 *  - Haversine formula calculates real-time distance to incident
 *  - "TASK COMPLETED" button is DISABLED until officer is within 50 m
 *  - "SIMULATE ARRIVAL" dev button overrides geofence for demo presentations
 *  - Map placeholder with styled route visualisation (no external map SDK required)
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';

// ─────────────────────────────────────────────────────────────────────────────
// Haversine formula — great-circle distance in kilometres
// ─────────────────────────────────────────────────────────────────────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const R      = 6371;
  const toRad  = (d) => (d * Math.PI) / 180;
  const dLat   = toRad(lat2 - lat1);
  const dLon   = toRad(lon2 - lon1);
  const a      =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

// Geofence radius — officer must be within this distance to complete the task
const GEOFENCE_KM = 0.05; // 50 metres

// Priority badge colours
const PRIORITY_STYLE = {
  CRITICAL: { bg: '#DC2626', text: '#FFFFFF' },
  HIGH:     { bg: '#D97706', text: '#FFFFFF' },
  MODERATE: { bg: '#CA8A04', text: '#FFFFFF' },
};

// Open Google Maps / Apple Maps navigation to incident
const openNavigation = async (lat, lng) => {
  const web    = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  const native = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
  const apple  = `maps://app?daddr=${lat},${lng}`;
  try {
    if (Platform.OS === 'ios') {
      const canGoogle = await Linking.canOpenURL('comgooglemaps://');
      await Linking.openURL(canGoogle ? native : apple);
    } else {
      await Linking.openURL(web);
    }
  } catch (e) { console.warn('[Nav]', e.message); }
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function EnRouteScreen({
  incident,
  currentLocation, // initial location from App state
  isDemo,
  onTaskComplete,
  onCancel,
}) {
  const [liveLocation,    setLiveLocation]    = useState(currentLocation);
  const [simulateArrival, setSimulateArrival] = useState(false);
  const watchRef = useRef(null);

  // Start live GPS watch when mounted (skipped in demo/web mode)
  useEffect(() => {
    if (isDemo) return;
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy:         Location.Accuracy.High,
          distanceInterval: 5,    // update every 5 metres of movement
          timeInterval:     3000, // or every 3 seconds, whichever comes first
        },
        (loc) =>
          setLiveLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude }),
      );
    })();
    return () => { watchRef.current?.remove(); };
  }, [isDemo]);

  // ── Distance calculation ──────────────────────────────────────────────────
  const iLat = incident?.coordinates?.lat;
  const iLng = incident?.coordinates?.lng;

  const distanceKm =
    liveLocation && iLat != null
      ? haversineKm(liveLocation.lat, liveLocation.lng, iLat, iLng)
      : null;

  // Officer is within geofence OR dev override is active
  const isNearby = simulateArrival || (distanceKm != null && distanceKm <= GEOFENCE_KM);

  const distanceText = simulateArrival
    ? '12 m'
    : distanceKm != null
      ? distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} m`
        : `${distanceKm.toFixed(2)} km`
      : '—';

  const pStyle = PRIORITY_STYLE[incident?.priority] ?? PRIORITY_STYLE.MODERATE;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>EN ROUTE</Text>
        {/* Nav shortcut */}
        {iLat != null && (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => openNavigation(iLat, iLng)}
            activeOpacity={0.75}
          >
            <Text style={styles.navBtnText}>🗺 NAV</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Priority + title ── */}
        <View style={styles.titleSection}>
          <View style={[styles.priorityPill, { backgroundColor: pStyle.bg }]}>
            <Text style={[styles.priorityLabel, { color: pStyle.text }]}>
              ▲  {incident?.priority ?? 'UNKNOWN'}
            </Text>
          </View>
          <Text style={styles.incidentTitle}>{incident?.title}</Text>
          <Text style={styles.incidentSub}>
            {incident?.category}  ·  Reported {incident?.reported_at ?? 'N/A'}
          </Text>
        </View>

        {/* ── Map placeholder ── */}
        <View style={styles.mapCard}>
          <View style={styles.mapPlaceholder}>
            {/* Background grid — simulated roads */}
            <View style={[styles.road, styles.roadH1]} />
            <View style={[styles.road, styles.roadH2]} />
            <View style={[styles.road, styles.roadV1]} />
            <View style={[styles.road, styles.roadV2]} />

            {/* Route dot trail from officer → incident */}
            {[
              { left: 36,  top: 156 },
              { left: 66,  top: 138 },
              { left: 96,  top: 122 },
              { left: 128, top: 108 },
              { left: 160, top: 94  },
            ].map((pos, i) => (
              <View key={i} style={[styles.routeDot, { left: pos.left, top: pos.top }]} />
            ))}

            {/* Officer position (bottom-left blue pulsing dot) */}
            <View style={styles.officerMarker}>
              <View style={styles.officerPulse} />
              <View style={styles.officerCore} />
            </View>

            {/* Incident destination pin (top-right) */}
            <View style={styles.destMarker}>
              <Text style={styles.destPin}>📍</Text>
              <View style={styles.destLabelBox}>
                <Text style={styles.destLabelText} numberOfLines={1}>
                  {incident?.title?.split(' ').slice(0, 3).join(' ')}
                </Text>
              </View>
            </View>
          </View>

          {/* Distance badge overlaid on map */}
          <View style={[styles.mapBadge, isNearby && styles.mapBadgeNearby]}>
            <Text style={[styles.mapBadgeText, isNearby && styles.mapBadgeTextNearby]}>
              {isNearby ? '✅  AT LOCATION' : `📡  ${distanceText} to incident`}
            </Text>
          </View>
        </View>

        {/* ── Live distance status card ── */}
        <View style={[styles.distanceCard, isNearby && styles.distanceCardNearby]}>
          <View style={styles.distanceLeft}>
            <Text style={styles.distanceLabel}>DISTANCE TO INCIDENT</Text>
            <Text style={[styles.distanceValue, isNearby && styles.distanceValueNearby]}>
              {distanceText}
            </Text>
          </View>
          <View style={[styles.geofencePill, { backgroundColor: isNearby ? '#D1FAE5' : '#F3F4F6' }]}>
            <Text style={[styles.geofencePillText, { color: isNearby ? '#059669' : '#9CA3AF' }]}>
              {isNearby ? '✓ IN ZONE' : '50 m radius'}
            </Text>
          </View>
        </View>

        {/* ── Incident detail card ── */}
        <View style={styles.detailCard}>
          <Text style={styles.detailHeading}>INCIDENT DETAILS</Text>
          <Text style={styles.detailDescription}>{incident?.description}</Text>
          <View style={styles.detailMeta}>
            <Text style={styles.detailMetaText}>
              📍 {iLat?.toFixed(4)}, {iLng?.toFixed(4)}
            </Text>
            <Text style={styles.detailMetaText}>
              🎯 Score: {incident?.impact_score ?? '—'}/100
            </Text>
          </View>
        </View>

        {/* Spacer so scroll clears the fixed footer */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Fixed footer ── */}
      <View style={styles.footer}>
        {/* Simulate arrival — only shown when NOT yet simulating */}
        {!simulateArrival && (
          <TouchableOpacity
            style={styles.simBtn}
            onPress={() => setSimulateArrival(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.simBtnText}>⚙  SIMULATE ARRIVAL</Text>
          </TouchableOpacity>
        )}

        {/* TASK COMPLETED — locked behind 50 m geofence */}
        <TouchableOpacity
          style={[styles.completeBtn, !isNearby && styles.completeBtnLocked]}
          onPress={isNearby ? onTaskComplete : undefined}
          activeOpacity={isNearby ? 0.85 : 1}
        >
          <Text style={[styles.completeBtnText, !isNearby && styles.completeBtnTextLocked]}>
            {isNearby ? '✓  TASK COMPLETED' : '🔒  TASK COMPLETED'}
          </Text>
          {!isNearby && (
            <Text style={styles.completeBtnHint}>Move within 50 m to unlock</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F9FAFB' },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F3F4',
  },
  backBtn:  { paddingVertical: 6, paddingRight: 12 },
  backText: { fontSize: 14, fontWeight: '700', color: '#2563EB', letterSpacing: 0.5 },
  headerTitle: {
    fontSize: 15, fontWeight: '900', color: '#111827', letterSpacing: 2,
  },
  navBtn: {
    backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE',
  },
  navBtnText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },

  // ── Scroll ──────────────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  // ── Title section ──────────────────────────────────────────────────────────
  titleSection: { gap: 8 },
  priorityPill: {
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  priorityLabel:   { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  incidentTitle:   { fontSize: 22, fontWeight: '900', color: '#111827', lineHeight: 30 },
  incidentSub:     { fontSize: 12, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1 },

  // ── Map card ───────────────────────────────────────────────────────────────
  mapCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F1F3F4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  mapPlaceholder: {
    height: 190, backgroundColor: '#E8EDF5', position: 'relative',
  },

  // Simulated roads
  road: { position: 'absolute', backgroundColor: '#FFFFFF' },
  roadH1: { left: 0, right: 0, top: 90,  height: 3 },
  roadH2: { left: 0, right: 0, top: 145, height: 2 },
  roadV1: { top: 0, bottom: 0, left: 100, width: 3 },
  roadV2: { top: 0, bottom: 0, left: 200, width: 2 },

  // Route dots
  routeDot: {
    position: 'absolute', width: 7, height: 7,
    borderRadius: 4, backgroundColor: '#2563EB', opacity: 0.7,
  },

  // Officer position marker
  officerMarker: {
    position: 'absolute', left: 18, top: 145,
    width: 22, height: 22, alignItems: 'center', justifyContent: 'center',
  },
  officerPulse: {
    position: 'absolute', width: 22, height: 22,
    borderRadius: 11, backgroundColor: 'rgba(37,99,235,0.2)',
  },
  officerCore: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#2563EB', borderWidth: 2, borderColor: '#FFFFFF',
  },

  // Destination pin
  destMarker: {
    position: 'absolute', right: 28, top: 20,
    alignItems: 'center', gap: 3,
  },
  destPin:      { fontSize: 26 },
  destLabelBox: {
    backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: '#E5E7EB',
    maxWidth: 110,
  },
  destLabelText: { fontSize: 10, fontWeight: '700', color: '#374151' },

  // Map badge overlay
  mapBadge: {
    margin: 12, alignSelf: 'flex-start',
    backgroundColor: 'rgba(17,24,39,0.75)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  mapBadgeNearby:     { backgroundColor: 'rgba(5,150,105,0.85)' },
  mapBadgeText:       { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  mapBadgeTextNearby: { color: '#FFFFFF' },

  // ── Distance card ──────────────────────────────────────────────────────────
  distanceCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#F1F3F4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  distanceCardNearby: { borderColor: '#A7F3D0' },
  distanceLeft:       { gap: 4 },
  distanceLabel:      { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 2 },
  distanceValue:      { fontSize: 26, fontWeight: '900', color: '#111827' },
  distanceValueNearby:{ color: '#059669' },
  geofencePill: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, alignItems: 'center',
  },
  geofencePillText: { fontSize: 12, fontWeight: '700' },

  // ── Detail card ────────────────────────────────────────────────────────────
  detailCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 18, gap: 12,
    borderWidth: 1, borderColor: '#F1F3F4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  detailHeading:     { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 2 },
  detailDescription: { fontSize: 15, fontWeight: '600', color: '#374151', lineHeight: 22 },
  detailMeta:        { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  detailMetaText:    { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16, paddingBottom: 28, paddingTop: 14,
    gap: 10, backgroundColor: '#FFFFFF',
    borderTopWidth: 1, borderTopColor: '#F1F3F4',
  },

  // Dev override button — visible but subtle
  simBtn: {
    alignSelf: 'center',
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  simBtnText: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1 },

  // TASK COMPLETED — main CTA
  completeBtn: {
    backgroundColor: '#10B981', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    gap: 4,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  completeBtnLocked: {
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0, elevation: 0,
  },
  completeBtnText: {
    fontSize: 17, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5,
  },
  completeBtnTextLocked: { color: '#9CA3AF' },
  completeBtnHint: { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
});
