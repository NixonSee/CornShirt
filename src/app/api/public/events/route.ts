import { NextResponse } from "next/server";

import { getActiveEvents } from "@/lib/publicEvents";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const events = await getActiveEvents();
    return NextResponse.json({ events });
  } catch (error) {
    console.error("Public active-event query failed", error);
    return NextResponse.json(
      { error: "Unable to load live events." },
      { status: 500 },
    );
  }
}
