/**
 * IncidentListScreen.js — INCIDENT_LIST State
 * ==============================================
 * Shows all incidents belonging to the selected scenario.
 *
 * Interaction contract:
 *  - Tapping an incident expands it (accordion) — only one open at a time
 *  - Expanded view shows: full description, ACCEPT (primary) + DECLINE (ghost)
 *  - ACCEPT → transitions to EN_ROUTE with that incident
 *  - DECLINE → collapses the accordion, incident stays in queue
 *  - Bottom section: "Awaiting Dispatch Locations" — depot list with distances
 */

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';

// Priority badge config
const PRIORITY_META = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  HIGH:     { bg: '#FFF7ED', text: '#D97706', border: '#FED7AA' },
  MODERATE: { bg: '#FEFCE8', text: '#CA8A04', border: '#FDE68A' },
};
const getPriorityMeta = (p = '') =>
  PRIORITY_META[p.toUpperCase()] ?? PRIORITY_META.MODERATE;

export default function IncidentListScreen({
  scenario,   // { id, icon, color, accentBg, incidents, depots }
  onAccept,   // (incident) => void
  onBack,     // () => void
}) {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) =>
    setExpandedId(prev => (prev === id ? null : id));

  const handleAccept  = (incident) => { setExpandedId(null); onAccept(incident); };
  const handleDecline = ()          => setExpandedId(null);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← QUEUE</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>{scenario?.icon}</Text>
          <Text style={styles.headerTitle}>{scenario?.id}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.headerCount}>{scenario?.incidents?.length ?? 0} open</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Section label ── */}
        <Text style={styles.sectionLabel}>ACTIVE INCIDENTS</Text>

        {/* ── Incident accordion list ── */}
        {(scenario?.incidents ?? []).map((incident) => {
          const isOpen  = expandedId === incident.event_id;
          const pm      = getPriorityMeta(incident.priority);

          return (
            <View
              key={incident.event_id}
              style={[styles.incidentCard, isOpen && styles.incidentCardOpen]}
            >
              {/* ── Collapsed row — always visible ── */}
              <TouchableOpacity
                style={styles.incidentRow}
                onPress={() => toggleExpand(incident.event_id)}
                activeOpacity={0.75}
              >
                {/* Left: priority dot + title stack */}
                <View style={styles.incidentLeft}>
                  <View style={[styles.priorityDot, { backgroundColor: pm.text }]} />
                  <View style={styles.incidentTitleGroup}>
                    <Text style={styles.incidentTitle} numberOfLines={isOpen ? undefined : 1}>
                      {incident.title}
                    </Text>
                    <Text style={styles.incidentMeta}>
                      📍 {incident.distance_km?.toFixed(1)} km  ·  {incident.reported_at}
                    </Text>
                  </View>
                </View>

                {/* Right: priority badge + chevron */}
                <View style={styles.incidentRight}>
                  <View style={[styles.priorityBadge, { backgroundColor: pm.bg, borderColor: pm.border }]}>
                    <Text style={[styles.priorityBadgeText, { color: pm.text }]}>
                      {incident.priority}
                    </Text>
                  </View>
                  <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {/* ── Expanded panel — description + action buttons ── */}
              {isOpen && (
                <View style={styles.expandedPanel}>
                  {/* Divider */}
                  <View style={styles.expandDivider} />

                  {/* Full description */}
                  <Text style={styles.expandDescription}>{incident.description}</Text>

                  {/* Impact score chip */}
                  <View style={styles.scoreRow}>
                    <View style={styles.scoreChip}>
                      <Text style={styles.scoreChipLabel}>IMPACT</Text>
                      <Text style={styles.scoreChipValue}>{incident.impact_score}/100</Text>
                    </View>
                    <View style={styles.scoreChip}>
                      <Text style={styles.scoreChipLabel}>DISTANCE</Text>
                      <Text style={styles.scoreChipValue}>{incident.distance_km?.toFixed(1)} km</Text>
                    </View>
                    <View style={styles.scoreChip}>
                      <Text style={styles.scoreChipLabel}>EVENT ID</Text>
                      <Text style={styles.scoreChipValue}>
                        {incident.event_id?.slice(-6).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={handleDecline}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.declineBtnText}>✕  DECLINE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAccept(incident)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.acceptBtnText}>✓  ACCEPT</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {/* ── Awaiting Dispatch Locations ── */}
        <View style={styles.depotSection}>
          <Text style={styles.sectionLabel}>AWAITING DISPATCH LOCATIONS</Text>
          <Text style={styles.sectionSub}>
            Nearest depots for {scenario?.id} response
          </Text>

          {(scenario?.depots ?? []).map((depot, i) => (
            <View key={i} style={styles.depotCard}>
              <View style={styles.depotLeft}>
                <View style={[styles.depotIcon, { backgroundColor: scenario?.accentBg ?? '#F9FAFB' }]}>
                  <Text style={styles.depotIconText}>🏭</Text>
                </View>
                <View>
                  <Text style={styles.depotName}>{depot.name}</Text>
                  <Text style={styles.depotAddress}>{depot.address}</Text>
                </View>
              </View>
              <View style={styles.depotDistBadge}>
                <Text style={styles.depotDistText}>{depot.distance_km?.toFixed(1)} km</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F3F4',
  },
  backBtn:   { paddingVertical: 4, paddingRight: 8, minWidth: 70 },
  backText:  { fontSize: 14, fontWeight: '700', color: '#2563EB' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerIcon:   { fontSize: 18 },
  headerTitle:  { fontSize: 15, fontWeight: '900', color: '#111827', letterSpacing: 1.5 },
  headerRight:  { minWidth: 70, alignItems: 'flex-end' },
  headerCount:  { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  // ── Scroll content ─────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 16, paddingTop: 18, gap: 10 },

  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: '#9CA3AF',
    letterSpacing: 2.5, marginBottom: 2,
  },
  sectionSub: {
    fontSize: 12, fontWeight: '500', color: '#9CA3AF', marginBottom: 10,
  },

  // ── Incident card ──────────────────────────────────────────────────────────
  incidentCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#F1F3F4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  incidentCardOpen: {
    borderColor: '#BFDBFE',
    shadowOpacity: 0.08,
  },

  // Collapsed row
  incidentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 10,
  },
  incidentLeft: {
    flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  priorityDot: {
    width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0,
  },
  incidentTitleGroup: { flex: 1, gap: 3 },
  incidentTitle: { fontSize: 14, fontWeight: '700', color: '#111827', lineHeight: 20 },
  incidentMeta:  { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },

  incidentRight: { alignItems: 'flex-end', gap: 6, flexShrink: 0 },
  priorityBadge: {
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 8, borderWidth: 1,
  },
  priorityBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
  chevron: { fontSize: 10, fontWeight: '700', color: '#9CA3AF' },

  // Expanded panel
  expandedPanel: { paddingHorizontal: 16, paddingBottom: 18 },
  expandDivider: {
    height: 1, backgroundColor: '#F1F3F4', marginBottom: 14,
  },
  expandDescription: {
    fontSize: 14, fontWeight: '500', color: '#374151', lineHeight: 22,
    marginBottom: 14,
  },
  scoreRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  scoreChip: {
    flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10,
    padding: 10, alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#F1F3F4',
  },
  scoreChipLabel: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.5 },
  scoreChipValue: { fontSize: 13, fontWeight: '900', color: '#374151' },

  // Accept / Decline buttons
  actionRow: { flexDirection: 'row', gap: 10 },
  declineBtn: {
    flex: 0.6, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  declineBtnText: { fontSize: 13, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1 },
  acceptBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  acceptBtnText: { fontSize: 14, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },

  // ── Depot section ──────────────────────────────────────────────────────────
  depotSection: { marginTop: 8, gap: 8 },
  depotCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderWidth: 1, borderColor: '#F1F3F4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  depotLeft:      { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  depotIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  depotIconText:  { fontSize: 18 },
  depotName:      { fontSize: 13, fontWeight: '700', color: '#111827' },
  depotAddress:   { fontSize: 11, fontWeight: '500', color: '#9CA3AF', marginTop: 2 },
  depotDistBadge: {
    backgroundColor: '#F9FAFB', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  depotDistText: { fontSize: 13, fontWeight: '700', color: '#374151' },
});
