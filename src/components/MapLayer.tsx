"use client";

import { useEffect, useRef } from "react";
import type { PulseEvent } from "@/lib/types";

// Leaflet types only — actual import is dynamic
import type L from "leaflet";

const HYDERABAD: [number, number] = [17.385, 78.4867];
const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a>';

interface MapLayerProps {
  events: PulseEvent[];
}

export function MapLayer({ events }: MapLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const eventMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const officerMarkersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const linesRef = useRef<Map<string, L.Polyline>>(new Map());

  // Load Leaflet dynamically (SSR-safe)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const leaflet = await import("leaflet");
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      leafletRef.current = leaflet.default;
      const Lf = leaflet.default;

      const map = Lf.map(containerRef.current, {
        center: HYDERABAD,
        zoom: 12,
        zoomControl: false,
        attributionControl: false,
      });

      Lf.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
      Lf.control.zoom({ position: "bottomright" }).addTo(map);

      mapRef.current = map;

      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(containerRef.current);
    })();

    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    const Lf = leafletRef.current;
    if (!map || !Lf) return;

    const activeIds = new Set(events.map(e => e.event_id));

    eventMarkersRef.current.forEach((m, id) => {
      if (!activeIds.has(id)) { m.remove(); eventMarkersRef.current.delete(id); }
    });
    officerMarkersRef.current.forEach((m, id) => {
      if (!activeIds.has(id)) { m.remove(); officerMarkersRef.current.delete(id); }
    });
    linesRef.current.forEach((line, id) => {
      if (!activeIds.has(id)) { line.remove(); linesRef.current.delete(id); }
    });

    events.forEach(event => {
      const latlng: [number, number] = [event.coordinates.lat, event.coordinates.lng];

      if (!eventMarkersRef.current.has(event.event_id)) {
        const radius = event.severity === "critical" ? 9 : event.severity === "high" ? 7 : 5;
        const marker = Lf.circleMarker(latlng, {
          radius,
          fillColor: event.severity_color,
          color: event.severity_color,
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.5,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family:system-ui;font-size:12px;min-width:160px;">
            <div style="font-weight:600;margin-bottom:4px;color:#1e1e1e;">${event.summary}</div>
            <div style="color:#5c5856;font-size:10px;">${event.domain} · ${event.severity.toUpperCase()}</div>
            ${event.assigned_officer ? `<div style="color:#2563eb;font-size:10px;margin-top:4px;">→ ${event.assigned_officer.officer_id}</div>` : ""}
          </div>
        `);

        eventMarkersRef.current.set(event.event_id, marker);
      }

      if (event.assigned_officer) {
        const off = event.assigned_officer;
        const offLatLng: [number, number] = [off.current_lat, off.current_lng];

        if (!officerMarkersRef.current.has(event.event_id)) {
          const offMarker = Lf.circleMarker(offLatLng, {
            radius: 5,
            fillColor: "#2563eb",
            color: "#dbeafe",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
          }).addTo(map);
          officerMarkersRef.current.set(event.event_id, offMarker);
        }

        if (!linesRef.current.has(event.event_id)) {
          const line = Lf.polyline([offLatLng, latlng], {
            color: "#2563eb",
            weight: 1.5,
            opacity: 0.35,
            dashArray: "6, 8",
          }).addTo(map);
          linesRef.current.set(event.event_id, line);
        }
      }
    });
  }, [events]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--border)" }} />
  );
}
