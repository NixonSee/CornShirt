// Shared types for the interactive seat-map. Coordinates live in a fixed
// 1000x1000 virtual canvas (matches the seeded venue/zone data), origin at the
// top-left, stage near the top.

export const CANVAS_SIZE = 1000;
export const DEFAULT_STAGE: MapStage = { x: 350, y: 70, w: 300, h: 110 };

export type ZoneShape = {
  type: "rect" | "circle";
  x: number;
  y: number;
  w: number;
  h: number;
};

export type ZoneCategory = "seated" | "standing";

export interface MapStage {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SeatZone {
  /** zone_ref: venue_zones.zone_id for fixed zones, a custom id for drawn zones. */
  id: string;
  kind: "fixed" | "custom";
  shape: ZoneShape;
  label: string;
  category: ZoneCategory;
  /** Fixed: venue_zones.capacity. Custom: typed by the organizer. */
  capacity: number;
  /** null => unpriced (grey/dashed). A number => priced (green). */
  price: number | null;
  /** Buyer mode: which ticket_type a zone click should select. */
  ticketTypeId?: string;
  soldOut?: boolean;
}

export interface SeatMapProps {
  stage: MapStage;
  zones: readonly SeatZone[];
  /** Organizer pricing context: every zone is clickable to set its price. */
  editable?: boolean;
  selectedZoneId?: string | null;
  /** Pricing-click (organizer) or buyer click. */
  onSelectZone?: (id: string | null) => void;
  className?: string;
  ariaLabel?: string;
}
