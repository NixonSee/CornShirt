"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Image as ImageIcon,
  Plus,
  Rocket,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { Button } from "@/components/common/Button";

interface TicketTypeInput {
  id: string;
  name: string;
  price: string;
  supply: string;
  purchaseLimit: string;
  transferable: boolean;
}

const CATEGORIES = ["Concert", "Festival", "Theatre", "Sports", "Comedy", "Other"];

export default function CreateEventPage() {
  const router = useRouter();

  // Stable, SSR-safe ids for ticket tiers. useId matches between server and
  // client; the counter makes each added tier unique without randomness.
  // Tier 0 is seeded with a fixed index so the ref is never read during render.
  const tierBaseId = useId();
  const tierSeq = useRef(1);

  function makeTier(index: number): TicketTypeInput {
    return {
      id: `${tierBaseId}-tier-${index}`,
      name: "",
      price: "",
      supply: "",
      purchaseLimit: "4",
      transferable: true,
    };
  }

  const [eventName, setEventName] = useState("");
  const [artistName, setArtistName] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [ticketTypes, setTicketTypes] = useState<TicketTypeInput[]>(() => [
    makeTier(0),
  ]);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSupply = ticketTypes.reduce(
    (sum, tt) => sum + (Number(tt.supply) || 0),
    0,
  );

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerPreview(URL.createObjectURL(file));
  }

  function removeBanner() {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    setBannerFile(null);
    setBannerPreview(null);
    // Reset the input so the same file can be re-selected after removal.
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function addTicketType() {
    setTicketTypes((prev) => [...prev, makeTier(tierSeq.current++)]);
  }

  function removeTicketType(id: string) {
    setTicketTypes((prev) => prev.filter((tt) => tt.id !== id));
  }

  function updateTicketType(
    id: string,
    field: keyof TicketTypeInput,
    value: string | boolean,
  ) {
    setTicketTypes((prev) =>
      prev.map((tt) => (tt.id === id ? { ...tt, [field]: value } : tt)),
    );
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
    if (!bannerFile) {
      setErrorMessage("Banner image is required.");
      return;
    }
    if (ticketTypes.length === 0) {
      setErrorMessage("Add at least one ticket type.");
      return;
    }
    for (const tt of ticketTypes) {
      if (!tt.name.trim()) {
        setErrorMessage("All ticket types must have a name.");
        return;
      }
      const price = Number(tt.price);
      const supply = Number(tt.supply);
      const limit = Number(tt.purchaseLimit);
      if (isNaN(price) || price < 0) {
        setErrorMessage("Ticket prices must be 0 or greater.");
        return;
      }
      if (isNaN(supply) || supply < 1) {
        setErrorMessage("Ticket supply must be at least 1.");
        return;
      }
      if (isNaN(limit) || limit < 1) {
        setErrorMessage("Purchase limit must be at least 1.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.append("eventName", eventName.trim());
      body.append("artistName", artistName.trim());
      body.append("venue", venue.trim());
      body.append("eventDate", eventDate);
      body.append("category", category);
      body.append("description", description.trim());
      body.append("banner", bannerFile);
      body.append(
        "ticketTypes",
        JSON.stringify(
          ticketTypes.map((tt) => ({
            name: tt.name.trim(),
            price: Number(tt.price),
            supply: Number(tt.supply),
            purchaseLimit: Number(tt.purchaseLimit),
            transferable: tt.transferable,
          })),
        ),
      );

      const res = await fetch("/api/organizer/events", { method: "POST", body });

      if (res.ok) {
        setSuccessMessage(
          "Event submitted for admin approval. Redirecting to My Events...",
        );
        setTimeout(() => router.push("/organizer/events"), 1500);
      } else {
        const data = await res.json();
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
        <h1>Create Event</h1>
        <p className="ce-sub">
          Compose your event, mint its ticket tiers, then submit for admin approval.
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
              <input
                id="venue"
                type="text"
                placeholder="Stadium Merdeka"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
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
          {bannerFile && (
            <div className="ce-banner-foot">
              <p className="ce-banner-filename">{bannerFile.name}</p>
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

      {/* ── 03 · Ticketing ── */}
      <section className="ce-section">
        <aside className="ce-aside">
          <p className="ce-tag">03 // Ticketing Engine</p>
          <p className="ce-aside-desc">
            Configure each ticket tier&apos;s pricing, supply and transfer rules.
          </p>
        </aside>

        <div className="ce-tier-stack">
          {ticketTypes.map((tt, index) => (
            <div key={tt.id} className="ce-tier">
              <div className="ce-tier-head">
                <div>
                  <p className="ce-tier-tag">
                    Tier_{String(index + 1).padStart(2, "0")}
                  </p>
                  <input
                    className="ce-tier-name"
                    type="text"
                    placeholder="General Admission"
                    value={tt.name}
                    onChange={(e) =>
                      updateTicketType(tt.id, "name", e.target.value)
                    }
                    aria-label={`Ticket type ${index + 1} name`}
                  />
                </div>
                {ticketTypes.length > 1 && (
                  <button
                    type="button"
                    className="ce-tier-remove"
                    onClick={() => removeTicketType(tt.id)}
                    aria-label={`Remove ticket type ${index + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="ce-tier-metrics">
                <div className="ce-metric">
                  <label htmlFor={`tt-price-${tt.id}`}>Price (DICKEN)</label>
                  <input
                    id={`tt-price-${tt.id}`}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={tt.price}
                    onChange={(e) =>
                      updateTicketType(tt.id, "price", e.target.value)
                    }
                  />
                </div>
                <div className="ce-metric">
                  <label htmlFor={`tt-supply-${tt.id}`}>Total supply</label>
                  <input
                    id={`tt-supply-${tt.id}`}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="500"
                    value={tt.supply}
                    onChange={(e) =>
                      updateTicketType(tt.id, "supply", e.target.value)
                    }
                  />
                </div>
                <div className="ce-metric">
                  <label htmlFor={`tt-limit-${tt.id}`}>Max per wallet</label>
                  <input
                    id={`tt-limit-${tt.id}`}
                    type="number"
                    min="1"
                    step="1"
                    placeholder="4"
                    value={tt.purchaseLimit}
                    onChange={(e) =>
                      updateTicketType(tt.id, "purchaseLimit", e.target.value)
                    }
                  />
                </div>
                <label
                  className="ce-toggle"
                  htmlFor={`tt-transfer-${tt.id}`}
                >
                  <span className="ce-metric-label">Transferable</span>
                  <span className="ce-toggle-row">
                    <input
                      id={`tt-transfer-${tt.id}`}
                      type="checkbox"
                      checked={tt.transferable}
                      onChange={(e) =>
                        updateTicketType(tt.id, "transferable", e.target.checked)
                      }
                    />
                    <span>{tt.transferable ? "Resale on" : "Resale off"}</span>
                  </span>
                </label>
              </div>
            </div>
          ))}

          <button type="button" className="ce-add-tier" onClick={addTicketType}>
            <Plus size={16} />
            Add another ticket tier
          </button>
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
            <span className="ce-deploy-label">Ticket tiers</span>
            <strong>{ticketTypes.length}</strong>
          </div>
          <div>
            <span className="ce-deploy-label">Total supply</span>
            <strong>{totalSupply.toLocaleString()}</strong>
          </div>
          <div className="ce-deploy-status">
            <span className="ce-deploy-dot" />
            Submits for admin approval
          </div>
        </div>
        <div className="ce-deploy-actions">
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            icon={!isSubmitting ? <Rocket size={16} /> : undefined}
          >
            {isSubmitting ? "Submitting..." : "Submit Event"}
          </Button>
        </div>
      </div>
    </form>
  );
}
