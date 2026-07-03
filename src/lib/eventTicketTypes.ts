import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface LayoutCustomZone {
  id: string;
  shape: { type: "rect" | "circle"; x: number; y: number; w: number; h: number };
  label: string;
  category: "seated" | "standing";
}

export interface LayoutPricing {
  price: number;
  capacity: number;
}

export interface EventLayout {
  version: number;
  customZones: LayoutCustomZone[];
  pricing: Record<string, LayoutPricing>;
}

/** A ticket_types row minus event_id, which the caller fills after the event exists. */
export interface TicketTypeDraft {
  type_name: string;
  price: number;
  total_supply: number;
  remaining_supply: number;
  venue_zone_id: string | null;
  zone_ref: string;
}

type BuildResult =
  | { ok: true; rows: TicketTypeDraft[] }
  | { ok: false; error: string; status: number };

/** Parse and validate a layout blob coming off a create/edit request. */
export function parseLayout(layoutJson: string | null): EventLayout | null {
  try {
    const layout = JSON.parse(layoutJson ?? "");
    if (!layout || typeof layout !== "object" || !layout.pricing) return null;
    return layout as EventLayout;
  } catch {
    return null;
  }
}

/**
 * Turn a validated layout into one ticket_types draft per priced zone. Fixed
 * zones are cross-checked against the venue's authoritative venue_zones so the
 * client can't spoof a label, capacity, or a zone from another venue. Shared by
 * the create (POST) and edit (PUT) organizer-event routes so the two can't drift.
 */
export async function buildTicketTypeRows(
  venueId: string,
  layout: EventLayout,
): Promise<BuildResult> {
  const pricingEntries = Object.entries(layout.pricing ?? {});
  if (pricingEntries.length === 0) {
    return {
      ok: false,
      error: "Price at least one zone before submitting.",
      status: 400,
    };
  }

  const { data: venueZonesData, error: venueZonesError } = await supabaseAdmin
    .from("venue_zones")
    .select("zone_id, label, capacity")
    .eq("venue_id", venueId);

  if (venueZonesError) {
    return {
      ok: false,
      error: "Unable to verify venue zones: " + venueZonesError.message,
      status: 500,
    };
  }

  const fixedZoneMap = new Map(
    (venueZonesData ?? []).map((z) => [
      z.zone_id as string,
      { label: z.label as string, capacity: z.capacity as number },
    ]),
  );
  const customZoneMap = new Map(
    (layout.customZones ?? []).map((z) => [z.id, z]),
  );

  const rows: TicketTypeDraft[] = [];

  for (const [zoneId, entry] of pricingEntries) {
    const price = Number(entry?.price);
    if (!Number.isFinite(price) || price < 0) {
      return {
        ok: false,
        error: "Every priced zone needs a valid price.",
        status: 400,
      };
    }

    const fixed = fixedZoneMap.get(zoneId);
    if (fixed) {
      rows.push({
        type_name: fixed.label,
        price,
        total_supply: fixed.capacity,
        remaining_supply: fixed.capacity,
        venue_zone_id: zoneId,
        zone_ref: zoneId,
      });
      continue;
    }

    const custom = customZoneMap.get(zoneId);
    if (custom) {
      const capacity = Number(entry?.capacity);
      if (!Number.isFinite(capacity) || capacity < 1) {
        return {
          ok: false,
          error: `Custom zone "${custom.label}" needs a capacity of at least 1.`,
          status: 400,
        };
      }
      rows.push({
        type_name: custom.label?.trim() || "Zone",
        price,
        total_supply: capacity,
        remaining_supply: capacity,
        venue_zone_id: null,
        zone_ref: zoneId,
      });
      continue;
    }

    return {
      ok: false,
      error: "A priced zone does not belong to the selected venue.",
      status: 400,
    };
  }

  return { ok: true, rows };
}
