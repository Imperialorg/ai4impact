export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Officer {
  officer_id: string;
  current_lat: number;
  current_lng: number;
}

export interface PulseEvent {
  event_id: string;
  status: "NEW" | "ANALYZING" | "DISPATCHED" | "IN_PROGRESS" | "RESOLVED";
  coordinates: Coordinates;
  severity_color: string;
  severity: "standard" | "high" | "critical";
  domain: "Municipal" | "Traffic" | "Construction" | "Emergency" | "Water" | "Electricity";
  summary: string;
  assigned_officer?: Officer;
  log_message: string;
  timestamp: number;
  thumbnail?: string;
  original_text?: string;
}

export interface SwarmLogEntry {
  id: string;
  type: "analysis" | "dispatch" | "verification" | "escalation" | "system";
  message: string;
  timestamp: number;
  event_id?: string;
}

export interface IntakeFeedItem {
  id: string;
  channel: "whatsapp" | "twitter" | "portal" | "camera" | "sensor";
  original_text: string;
  translated_text: string;
  thumbnail?: string;
  timestamp: number;
  coordinates?: Coordinates;
}
