import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function synchronizeFinishedEvents(): Promise<void> {
  const { error } = await supabaseAdmin.rpc("complete_finished_events");

  if (error) {
    console.error("Finished-event synchronization failed", {
      code: error.code,
      message: error.message,
    });
  }
}

