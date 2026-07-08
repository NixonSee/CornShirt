"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  MousePointerClick,
  Rocket,
  Save,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/common/Button";
import { SeatMap } from "@/components/seatmap/SeatMap";
import { DEFAULT_STAGE, type SeatZone } from "@/components/seatmap/types";

const CATEGORIES = ["Concert", "Festival", "Theatre", "Sports", "Comedy", "Other"];

interface VenueZone {
  zone_id: string;
  code: string;
  label: string;
  capacity: number;
  category: "seated" | "standing";
  shape: { type: "rect" | "circle"; x: number; y: number; w: number; h: number };
}

interface Venue {
  venue_id: string;
  name: string;
  venue_type: string;
  total_capacity: number;
  layout: { stage?: { x: number; y: number; w: number; h: number } } | null;
  venue_zones: VenueZone[];
}

export interface EventFormInitialValues {
  eventName: string;
  artistName: string;
  venueId: string;
  eventDate: string; // "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
  category: string;
  description: string;
  bannerUrl: string | null;
  pricing: Record<string, string>; // keyed by zone_id
}

interface EventFormProps {
  mode: "create" | "edit";
  eventId?: string;
  initialValues?: EventFormInitialValues;
}

export function EventForm({ mode, eventId, initialValues }: EventFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [eventName, setEventName] = useState(initialValues?.eventName ?? "");
  const [artistName, setArtistName] = useState(initialValues?.artistName ?? "");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState(initialValues?.venueId ?? "");
  const [eventDate, setEventDate] = useState(initialValues?.eventDate ?? "");
  const [category, setCategory] = useState(initialValues?.category ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(
    initialValues?.bannerUrl ?? null,
  );
  // The remote banner URL is not an object URL, so it must not be revoked.
  const [bannerIsLocal, setBannerIsLocal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Zone pricing state ──
  const [pricing, setPricing] = useState<Record<string, string>>(
    initialValues?.pricing ?? {},
  );
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load the admin-curated venues for the picker. RLS is off on venues, but we
  // read through the organizer-guarded /api/venues route to keep the convention.
  useEffect(() => {
    const controller = new AbortController();

    async function loadVenues() {
      try {
        const res = await fetch("/api/venues", { signal: controller.signal });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Unable to load venues.");
        if (!controller.signal.aborted) {
          setVenues(Array.isArray(payload.venues) ? payload.venues : []);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load venues.",
        );
      }
    }

    void loadVenues();
    return () => controller.abort();
  }, []);

  const selectedVenue = venues.find((v) => v.venue_id === venueId) ?? null;
  const venueStage = selectedVenue?.layout?.stage ?? DEFAULT_STAGE;

  // The venue's fixed zones, with the organizer's price merged in.
  const zones: SeatZone[] = (selectedVenue?.venue_zones ?? []).map((z) => {
    const raw = pricing[z.zone_id];
    const price = raw !== undefined && raw !== "" ? Number(raw) : null;
    return {
      id: z.zone_id,
      kind: "fixed",
      shape: z.shape,
      label: z.label,
      category: z.category,
      capacity: z.capacity,
      price: price != null && Number.isFinite(price) ? price : null,
    };
  });

  const selectedZone = zones.find((z) => z.id === selectedZoneId) ?? null;
  const pricedCount = zones.filter((z) => z.price != null).length;
  const totalCapacity = zones
    .filter((z) => z.price != null)
    .reduce((sum, z) => sum + (z.capacity || 0), 0);

  function handleVenueChange(nextVenueId: string) {
    setVenueId(nextVenueId);
    // Reset pricing when the venue changes — fixed zones differ.
    setPricing({});
    setSelectedZoneId(null);
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    if (bannerPreview && bannerIsLocal) URL.revokeObjectURL(bannerPreview);
    setBannerPreview(URL.createObjectURL(file));
    setBannerIsLocal(true);
  }

  function removeBanner() {
    if (bannerPreview && bannerIsLocal) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    setBannerIsLocal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function setZonePrice(id: string, value: string) {
    setPricing((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!eventName.trim()) {
      setErrorMessage("Event name is required.");
      return;
    }
    if (!eventDate) {
      setErrorMessage("Event date is required.");
      return;
    }
    if (!venueId) {
      setErrorMessage("Please select a venue.");
      return;
    }
    // A banner is required, but on edit an existing one (bannerPreview) counts.
    if (!bannerFile && !bannerPreview) {
      setErrorMessage("Banner image is required.");
      return;
    }
    if (zones.length === 0) {
      setErrorMessage("This venue has no zones to price.");
      return;
    }

    // Every zone must be priced before submitting.
    for (const zone of zones) {
      if (zone.price == null || zone.price < 0) {
        setErrorMessage(
          `Every zone must be priced before submitting — "${zone.label}" is still unpriced.`,
        );
        setSelectedZoneId(zone.id);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const layout = {
        version: 1,
        customZones: [],
        pricing: Object.fromEntries(
          zones.map((z) => [
            z.id,
            { price: Number(pricing[z.id]), capacity: z.capacity },
          ]),
        ),
      };

      const body = new FormData();
      body.append("eventName", eventName.trim());
      body.append("artistName", artistName.trim());
      body.append("venueId", venueId);
      body.append("venue", selectedVenue?.name ?? "");
      body.append("eventDate", eventDate);
      body.append("category", category);
      body.append("description", description.trim());
      // Only send the banner when a new file was picked — edit keeps the old one.
      if (bannerFile) body.append("banner", bannerFile);
      body.append("layout", JSON.stringify(layout));

      const res = await fetch(
        isEdit ? `/api/organizer/events/${eventId}` : "/api/organizer/events",
        { method: isEdit ? "PUT" : "POST", body },
      );

      const data = await res.json();

      if (res.ok) {
        if (isEdit) {
          setSuccessMessage("Changes saved. Redirecting to your event...");
          setTimeout(() => {
            router.push(`/organizer/events/${eventId}`);
            router.refresh();
          }, 1200);
        } else {
          setSuccessMessage(
            "Event submitted for admin approval. Redirecting to your event...",
          );
          const dest = data?.eventId
            ? `/organizer/events/${data.eventId}`
            : "/organizer/events";
          setTimeout(() => {
            router.push(dest);
            router.refresh();
          }, 1500);
        }
      } else {
        setErrorMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ce-page">
      <header className="ce-head">
        <p className="ce-eyebrow">{"// ORGANIZER CONSOLE"}</p>
        <h1>{isEdit ? "Edit Event" : "Create Event"}</h1>
        <p className="ce-sub">
          {isEdit
            ? "Update your event details and pricing while it awaits admin approval."
            : "Compose your event, price its venue zones, then submit for admin approval."}
        </p>
      </header>

      {/* ── 01 · Event details ── */}
      <section className="ce-section">
        <aside className="ce-aside">
          <p className="ce-tag">01 // Event Intel</p>
          <p className="ce-aside-desc">
            The core identity and metadata that defines your event listing.
          </p>
        </aside>

        <div className="ce-panel">
          <div className="ce-field">
            <label htmlFor="eventName">Event name</label>
            <input
              id="eventName"
              type="text"
              placeholder="e.g. Neon Corn Festival 2026"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              required
            />
          </div>

          <div className="ce-grid-2">
            <div className="ce-field">
              <label htmlFor="artistName">Artist / Performer</label>
              <input
                id="artistName"
                type="text"
                placeholder="Headlining act"
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
              />
            </div>
            <div className="ce-field">
              <label htmlFor="venue">Venue</label>
              <select
                id="venue"
                value={venueId}
                onChange={(e) => handleVenueChange(e.target.value)}
                required
              >
                <option value="">
                  {venues.length === 0 ? "Loading venues..." : "Select a venue"}
                </option>
                {venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>
                    {v.name} · {v.total_capacity.toLocaleString()} cap
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ce-grid-2">
            <div className="ce-field">
              <label htmlFor="eventDate">Date &amp; Time</label>
              <input
                id="eventDate"
                type="datetime-local"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                required
              />
            </div>
            <div className="ce-field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="ce-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Tell ticket buyers what makes this event unmissable..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* ── 02 · Media ── */}
      <section className="ce-section">
        <aside className="ce-aside">
          <p className="ce-tag">02 // Media Module</p>
          <p className="ce-aside-desc">
            The hero visual shown across the marketplace and on every ticket.
          </p>
        </aside>

        <div className="ce-panel ce-panel-flush">
          <div
            className="ce-banner"
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                fileInputRef.current?.click();
            }}
            aria-label="Choose banner image"
          >
            {bannerPreview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="ce-banner-img"
                />
                <div className="ce-banner-edit">
                  <ImageIcon size={15} />
                  Replace banner
                </div>
              </>
            ) : (
              <div className="ce-banner-empty">
                <span className="ce-banner-icon">
                  <UploadCloud size={26} />
                </span>
                <p className="ce-banner-title">Upload event banner</p>
                <p className="ce-banner-hint">
                  PNG, JPG or WebP · 16:9 recommended · max 10 MB
                </p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleBannerChange}
            aria-hidden="true"
          />
          {(bannerFile || bannerPreview) && (
            <div className="ce-banner-foot">
              <p className="ce-banner-filename">
                {bannerFile ? bannerFile.name : "Current banner"}
              </p>
              <button
                type="button"
                className="ce-banner-remove"
                onClick={removeBanner}
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── 03 · Zone pricing ── */}
      <section className="ce-section">
        <aside className="ce-aside">
          <p className="ce-tag">03 // Ticketing Engine</p>
          <p className="ce-aside-desc">
            Click a venue zone on the map and set its price. Each priced zone
            becomes a ticket type. Capacities are fixed by the venue.
          </p>
        </aside>

        <div className="ce-panel">
          {!selectedVenue ? (
            <div className="sm-empty">
              <MousePointerClick size={26} />
              <p>Select a venue to start pricing zones.</p>
            </div>
          ) : (
            <>
              <div className="sm-toolbar">
                <span className="sm-toolbar-hint">
                  Click a zone to set its price.
                </span>
              </div>

              <SeatMap
                editable
                stage={venueStage}
                zones={zones}
                selectedZoneId={selectedZoneId}
                onSelectZone={setSelectedZoneId}
                ariaLabel={`${selectedVenue.name} seat map`}
              />

              <div className="sm-legend">
                <span>
                  <i className="sm-swatch sm-swatch-empty" /> Unpriced
                </span>
                <span>
                  <i className="sm-swatch sm-swatch-priced" /> Priced
                </span>
                <span className="sm-legend-hint">
                  Priced zones become ticket types on submit
                </span>
              </div>

              {selectedZone ? (
                <div className="sm-zone-panel">
                  <div className="sm-zone-panel-head">
                    <span className="ce-tier-tag">{selectedZone.label}</span>
                  </div>

                  <div className="ce-grid-2">
                    <div className="ce-field">
                      <label htmlFor="zone-price">Price (MYR)</label>
                      <input
                        id="zone-price"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={pricing[selectedZone.id] ?? ""}
                        onChange={(e) =>
                          setZonePrice(selectedZone.id, e.target.value)
                        }
                        autoFocus
                      />
                    </div>
                    <div className="ce-field">
                      <label>Capacity</label>
                      <p className="sm-static-value">
                        {selectedZone.capacity.toLocaleString()} (fixed)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="sm-zone-panel-empty">
                  Select a zone on the map to price it.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {errorMessage && (
        <p className="form-error ce-alert" role="alert">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="form-success ce-alert" role="status">
          {successMessage}
        </p>
      )}

      {/* ── Sticky deploy bar ── */}
      <div className="ce-deploy-bar">
        <div className="ce-deploy-meta">
          <div>
            <span className="ce-deploy-label">Zones priced</span>
            <strong>
              {pricedCount}/{zones.length}
            </strong>
          </div>
          <div>
            <span className="ce-deploy-label">Total capacity</span>
            <strong>{totalCapacity.toLocaleString()}</strong>
          </div>
          <div className="ce-deploy-status">
            <span className="ce-deploy-dot" />
            {isEdit ? "Stays pending after saving" : "Submits for admin approval"}
          </div>
        </div>
        <div className="ce-deploy-actions">
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            icon={
              !isSubmitting ? (
                isEdit ? (
                  <Save size={16} />
                ) : (
                  <Rocket size={16} />
                )
              ) : undefined
            }
          >
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Submitting..."
              : isEdit
                ? "Save Changes"
                : "Submit Event"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default EventForm;
