import "server-only";

import { cache } from "react";

import {
  mapEventRow,
  type Event,
  type EventRow,
} from "@/app/visitor/data";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const PUBLIC_EVENT_SELECT = `
  event_id,
  event_name,
  artist_name,
  venue,
  event_date,
  description,
  banner_image,
  status,
  ticket_types (
    ticket_type_id,
    type_name,
    price,
    total_supply,
    remaining_supply,
    purchase_limit,
    transfer_allowed
  )
`;

export async function getActiveEvents(): Promise<Event[]> {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select(PUBLIC_EVENT_SELECT)
    .eq("status", "active")
    .order("event_date", { ascending: true });

  if (error) {
    throw new Error(`Unable to load active events: ${error.message}`);
  }

  return ((data ?? []) as unknown as EventRow[]).map(mapEventRow);
}

export const getActiveEventById = cache(
  async (eventId: string): Promise<Event | null> => {
    const { data, error } = await supabaseAdmin
      .from("events")
      .select(PUBLIC_EVENT_SELECT)
      .eq("status", "active")
      .eq("event_id", eventId)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to load active event: ${error.message}`);
    }

    return data ? mapEventRow(data as unknown as EventRow) : null;
  },
);
