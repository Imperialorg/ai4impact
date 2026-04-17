/**
 * ScenarioQueueScreen.js — SCENARIO_QUEUE State
 * ================================================
 * The primary dashboard shown when an officer is ON DUTY.
 * Replaces the old "Waiting for Dispatch" screen with an active queue.
 *
 * UI:
 *  - Status header (ON DUTY indicator, GPS coords, officer info)
 *  - ScrollView of scenario category cards (Water, Electrical, Road…)
 *  - Each card shows: icon, category name, incident count, highest severity
 *  - Tapping a card navigates to the INCIDENT_LIST for that category
 *  - GO OFF DUTY button pinned at the bottom
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';

// Highest-priority incident in a scenario — for the card's severity indicator
function getTopPriority(incidents = []) {
  const order = { CRITICAL: 0, HIGH: 1, MODERATE: 2 };
  return incidents.reduce((top, inc) => {
    const rank = order[inc.priority?.toUpperCase()] ?? 99;
    return rank < (order[top] ?? 99) ? inc.priority : top;
  }, 'MODERATE');
}

const PRIORITY_META = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', dot: '#DC2626' },
  HIGH:     { bg: '#FFF7ED', text: '#D97706', dot: '#D97706' },
  MODERATE: { bg: '#FEFCE8', text: '#CA8A04', dot: '#CA8A04' },
};

export default function ScenarioQueueScreen({
  scenarios,     // SCENARIOS array from App.js
  officerId,     // e.g. "OP-441"
  location,      // { lat, lng } | null
  isDemo,
  onSelectScenario,  // (scenario) => void
  onGoOffDuty,       // () => void
}) {
  const totalIncidents = scenarios.reduce((n, s) => n + (s.incidents?.length ?? 0), 0);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top status banner ── */}
      <View style={styles.banner}>
        <View style={styles.bannerLeft}>
          <View style={styles.onDotWrapper}>
            <View style={styles.onDotPulse} />
            <View style={styles.onDot} />
          </View>
          <View>
            <Text style={styles.onDutyLabel}>ON DUTY</Text>
            <Text style={styles.officerIdText}>{officerId}</Text>
          </View>
        </View>
        <View style={styles.bannerRight}>
          {isDemo && (
            <View style={styles.demoBadge}>
              <Text style={styles.demoBadgeText}>DEMO</Text>
            </View>
          )}
          <Text style={styles.gpsText}>
            {location
              ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
              : 'Acquiring GPS…'}
          </Text>
        </View>
      </View>

      {/* ── Summary strip ── */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          <Text style={styles.summaryCount}>{totalIncidents}</Text>
          {'  open incidents across  '}
          <Text style={styles.summaryCount}>{scenarios.length}</Text>
          {'  categories'}
        </Text>
      </View>

      {/* ── Scenario cards ── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>SCENARIO QUEUE</Text>

        {scenarios.map((scenario) => {
          const topPriority = getTopPriority(scenario.incidents);
          const pm          = PRIORITY_META[topPriority] ?? PRIORITY_META.MODERATE;
          const count       = scenario.incidents?.length ?? 0;

          return (
            <TouchableOpacity
              key={scenario.id}
              style={styles.scenarioCard}
              onPress={() => onSelectScenario(scenario)}
              activeOpacity={0.8}
            >
              {/* Left: coloured icon block */}
              <View style={[styles.iconBlock, { backgroundColor: scenario.accentBg ?? '#F9FAFB' }]}>
                <Text style={styles.scenarioIcon}>{scenario.icon}</Text>
              </View>

              {/* Centre: name + meta */}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{scenario.id}</Text>
                <Text style={styles.cardMeta}>
                  {scenario.depots?.[0]?.name ?? 'Field unit'}
                </Text>
              </View>

              {/* Right: incident count pill + severity indicator + chevron */}
              <View style={styles.cardRight}>
                {/* Incident count bubble */}
                <View style={[styles.countBubble, { backgroundColor: scenario.accentBg }]}>
                  <Text style={[styles.countText, { color: scenario.color }]}>
                    {count}
                  </Text>
                  <Text style={[styles.countSub, { color: scenario.color }]}>
                    {count === 1 ? 'INC' : 'INC'}
                  </Text>
                </View>

                {/* Severity dot */}
                <View style={[styles.severityDot, { backgroundColor: pm.dot }]} />

                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Bottom spacer */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* ── GO OFF DUTY — pinned footer ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.offDutyBtn}
          onPress={onGoOffDuty}
          activeOpacity={0.8}
        >
          <Text style={styles.offDutyBtnText}>GO OFF DUTY</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },

  // ── Status banner ──────────────────────────────────────────────────────────
  banner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F3F4',
  },
  bannerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
  onDotWrapper:  { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  onDotPulse: {
    position: 'absolute', width: 16, height: 16, borderRadius: 8,
    backgroundColor: 'rgba(5,150,105,0.2)',
  },
  onDot: {
    width: 9, height: 9, borderRadius: 5, backgroundColor: '#059669',
  },
  onDutyLabel:   { fontSize: 13, fontWeight: '900', color: '#059669', letterSpacing: 1.5 },
  officerIdText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', letterSpacing: 1 },

  bannerRight: { alignItems: 'flex-end', gap: 4 },
  demoBadge: {
    backgroundColor: '#F3F4F6', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end',
  },
  demoBadgeText: { fontSize: 9, fontWeight: '800', color: '#9CA3AF', letterSpacing: 2 },
  gpsText: { fontSize: 11, fontWeight: '500', color: '#9CA3AF' },

  // ── Summary strip ──────────────────────────────────────────────────────────
  summary: {
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F3F4',
  },
  summaryText:  { fontSize: 12, fontWeight: '500', color: '#9CA3AF' },
  summaryCount: { fontWeight: '800', color: '#374151' },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: '#9CA3AF', letterSpacing: 2.5,
    marginBottom: 4,
  },

  // ── Scenario card ──────────────────────────────────────────────────────────
  scenarioCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14,
    borderWidth: 1, borderColor: '#F1F3F4',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  iconBlock: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  scenarioIcon: { fontSize: 22 },

  cardBody:  { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111827', letterSpacing: 0.5 },
  cardMeta:  { fontSize: 11, fontWeight: '500', color: '#9CA3AF', marginTop: 3 },

  cardRight: {
    alignItems: 'center', gap: 6, flexShrink: 0,
    flexDirection: 'row',
  },
  countBubble: {
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    alignItems: 'center', minWidth: 44,
  },
  countText: { fontSize: 17, fontWeight: '900', lineHeight: 20 },
  countSub:  { fontSize: 9,  fontWeight: '700', letterSpacing: 1, lineHeight: 12 },
  severityDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  chevron: { fontSize: 22, color: '#D1D5DB', fontWeight: '300' },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16, paddingBottom: 28, paddingTop: 12,
    backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F1F3F4',
  },
  offDutyBtn: {
    paddingVertical: 16, borderRadius: 14, alignItems: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E5E7EB',
  },
  offDutyBtnText: {
    fontSize: 14, fontWeight: '800', color: '#6B7280', letterSpacing: 2,
  },
});
