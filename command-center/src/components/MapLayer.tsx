"use client";

import { useEffect, useRef, useCallback } from "react";
import type { PulseEvent } from "@/lib/types";

const HYDERABAD: [number, number] = [78.4867, 17.385]; // [lng, lat] for MapLibre

// CartoDB Positron via raster source in a MapLibre style — free, no API key
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-positron": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "carto-positron-layer",
      type: "raster",
      source: "carto-positron",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
  // Ensure type-compatibility
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
};

type MapLibreType = typeof import("maplibre-gl");

interface MapLayerProps {
  events: PulseEvent[];
}

export function MapLayer({ events }: MapLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mlRef = useRef<MapLibreType | null>(null);
  const readyRef = useRef(false);
  const eventsRef = useRef<PulseEvent[]>(events);
  eventsRef.current = events;

  const syncMarkers = useCallback(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!map || !ml || !readyRef.current) return;

    const currentEvents = eventsRef.current;

    // Build GeoJSON for event dots
    const eventFeatures: GeoJSON.Feature[] = currentEvents.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [e.coordinates.lng, e.coordinates.lat] },
      properties: {
        id: e.event_id,
        severity: e.severity,
        color: e.severity_color,
        summary: e.summary,
        domain: e.domain,
        status: e.status,
        officer: e.assigned_officer?.officer_id ?? "",
      },
    }));

    // Build GeoJSON for officer blips
    const officerFeatures: GeoJSON.Feature[] = currentEvents
      .filter((e) => e.assigned_officer)
      .map((e) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [e.assigned_officer!.current_lng, e.assigned_officer!.current_lat],
        },
        properties: { id: e.event_id, officer_id: e.assigned_officer!.officer_id },
      }));

    // Build GeoJSON for dispatch lines
    const lineFeatures: GeoJSON.Feature[] = currentEvents
      .filter((e) => e.assigned_officer)
      .map((e) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [e.assigned_officer!.current_lng, e.assigned_officer!.current_lat],
            [e.coordinates.lng, e.coordinates.lat],
          ],
        },
        properties: { id: e.event_id },
      }));

    const eventGeoJSON: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: eventFeatures };
    const officerGeoJSON: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: officerFeatures };
    const lineGeoJSON: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: lineFeatures };

    // Update or create sources
    // Heatmap source uses weight based on severity
    const heatFeatures: GeoJSON.Feature[] = currentEvents.map((e) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [e.coordinates.lng, e.coordinates.lat] },
      properties: {
        weight: e.severity === "critical" ? 1.0 : e.severity === "high" ? 0.7 : 0.3,
      },
    }));
    const heatGeoJSON: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: heatFeatures };

    const heatSrc = map.getSource("heat") as maplibregl.GeoJSONSource | undefined;
    if (heatSrc) {
      heatSrc.setData(heatGeoJSON);
    } else {
      map.addSource("heat", { type: "geojson", data: heatGeoJSON });
      map.addLayer({
        id: "heat-layer",
        type: "heatmap",
        source: "heat",
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.8, 15, 2],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 20, 15, 35],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(37,99,235,0.15)",
            0.4, "rgba(37,99,235,0.3)",
            0.6, "rgba(202,138,4,0.45)",
            0.8, "rgba(220,38,38,0.55)",
            1, "rgba(220,38,38,0.7)",
          ],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 12, 0.8, 16, 0.3],
        },
      });
    }

    const eventSrc = map.getSource("events") as maplibregl.GeoJSONSource | undefined;
    if (eventSrc) {
      eventSrc.setData(eventGeoJSON);
    } else {
      map.addSource("events", { type: "geojson", data: eventGeoJSON });
      map.addLayer({
        id: "events-circle",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": ["match", ["get", "severity"], "critical", 9, "high", 7, 5],
          "circle-color": ["get", "color"],
          "circle-opacity": 0.7,
          "circle-stroke-width": 2,
          "circle-stroke-color": ["get", "color"],
          "circle-stroke-opacity": 0.4,
        },
      });
      // Pulsing halo for critical events
      map.addLayer({
        id: "events-critical-halo",
        type: "circle",
        source: "events",
        filter: ["==", ["get", "severity"], "critical"],
        paint: {
          "circle-radius": 16,
          "circle-color": "#dc2626",
          "circle-opacity": 0.12,
        },
      });
    }

    const officerSrc = map.getSource("officers") as maplibregl.GeoJSONSource | undefined;
    if (officerSrc) {
      officerSrc.setData(officerGeoJSON);
    } else {
      map.addSource("officers", { type: "geojson", data: officerGeoJSON });
      map.addLayer({
        id: "officers-circle",
        type: "circle",
        source: "officers",
        paint: {
          "circle-radius": 5,
          "circle-color": "#2563eb",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#dbeafe",
          "circle-opacity": 0.9,
        },
      });
    }

    const lineSrc = map.getSource("dispatch-lines") as maplibregl.GeoJSONSource | undefined;
    if (lineSrc) {
      lineSrc.setData(lineGeoJSON);
    } else {
      map.addSource("dispatch-lines", { type: "geojson", data: lineGeoJSON });
      map.addLayer(
        {
          id: "dispatch-lines-layer",
          type: "line",
          source: "dispatch-lines",
          paint: {
            "line-color": "#2563eb",
            "line-width": 1.5,
            "line-opacity": 0.35,
            "line-dasharray": [4, 6],
          },
        },
        "events-circle" // below event dots
      );
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const ml = await import("maplibre-gl");
      if (cancelled || !containerRef.current) return;
      mlRef.current = ml;

      const map = new ml.Map({
        container: containerRef.current,
        style: MAP_STYLE as maplibregl.StyleSpecification,
        center: HYDERABAD,
        zoom: 12,
        attributionControl: false,
        fadeDuration: 0,
      });

      map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(new ml.AttributionControl({ compact: true }), "bottom-left");

      map.on("load", () => {
        if (cancelled) return;
        readyRef.current = true;
        syncMarkers();
      });

      // Click popup for events
      map.on("click", "events-circle", (e) => {
        if (!e.features?.[0]) return;
        const props = e.features[0].properties;
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

        new ml.Popup({ offset: 12, closeButton: false, maxWidth: "220px" })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family:system-ui;font-size:12px;">
              <div style="font-weight:600;margin-bottom:4px;color:#1e1e1e;">${props.summary}</div>
              <div style="color:#5c5856;font-size:10px;">${props.domain} · ${String(props.severity).toUpperCase()}</div>
              ${props.officer ? `<div style="color:#2563eb;font-size:10px;margin-top:4px;">→ ${props.officer}</div>` : ""}
            </div>`
          )
          .addTo(map);
      });

      map.on("mouseenter", "events-circle", () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", "events-circle", () => { map.getCanvas().style.cursor = ""; });

      mapRef.current = map;

      const ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        readyRef.current = false;
      }
    };
  }, [syncMarkers]);

  // Sync markers on events change
  useEffect(() => {
    syncMarkers();
  }, [events, syncMarkers]);

  return (
    <div ref={containerRef} className="w-full h-full rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--border)" }} />
  );
}
