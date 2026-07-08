"use client";

import {
  CANVAS_SIZE,
  type SeatMapProps,
  type SeatZone,
  type ZoneShape,
} from "./types";
import { formatMyr } from "@/lib/currency";

// Read-only / click-to-select seat map. Zones come from the venue's fixed
// layout; the organizer prices them (editable) and buyers pick one to purchase.

function zoneCenter(shape: ZoneShape) {
  return { cx: shape.x + shape.w / 2, cy: shape.y + shape.h / 2 };
}

function ShapeEl({ shape }: { shape: ZoneShape }) {
  if (shape.type === "circle") {
    const { cx, cy } = zoneCenter(shape);
    return <ellipse cx={cx} cy={cy} rx={shape.w / 2} ry={shape.h / 2} />;
  }
  return (
    <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={10} />
  );
}

export function SeatMap({
  stage,
  zones,
  editable = false,
  selectedZoneId = null,
  onSelectZone,
  className = "",
  ariaLabel = "Venue seat map",
}: SeatMapProps) {
  const interactive = Boolean(onSelectZone);

  function isClickable(zone: SeatZone) {
    if (!interactive) return false;
    // Organizer prices any zone; buyers can only pick a priced, available zone.
    return editable ? true : zone.price != null && !zone.soldOut;
  }

  return (
    <div className={["sm-frame", className].filter(Boolean).join(" ")}>
      <svg
        className="sm-svg"
        viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={ariaLabel}
      >
        {editable && (
          <g className="sm-grid" aria-hidden="true">
            {Array.from({ length: CANVAS_SIZE / 100 - 1 }, (_, i) => {
              const p = (i + 1) * 100;
              return (
                <g key={p}>
                  <line x1={p} y1={0} x2={p} y2={CANVAS_SIZE} />
                  <line x1={0} y1={p} x2={CANVAS_SIZE} y2={p} />
                </g>
              );
            })}
          </g>
        )}

        {/* Fixed stage */}
        <g className="sm-stage" aria-hidden="true">
          <rect
            className="sm-stage-rect"
            x={stage.x}
            y={stage.y}
            width={stage.w}
            height={stage.h}
            rx={8}
          />
          <text
            className="sm-stage-label"
            x={stage.x + stage.w / 2}
            y={stage.y + stage.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
          >
            STAGE
          </text>
        </g>

        {/* Zones */}
        {zones.map((zone) => {
          const { cx, cy } = zoneCenter(zone.shape);
          const priced = zone.price != null;
          const selected = zone.id === selectedZoneId;
          const clickable = isClickable(zone);

          const groupClass = [
            "sm-zone",
            priced ? "sm-zone-priced" : "sm-zone-empty",
            selected ? "sm-zone-selected" : "",
            zone.soldOut ? "sm-zone-soldout" : "",
            clickable ? "sm-zone-clickable" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <g
              key={zone.id}
              className={groupClass}
              onClick={clickable ? () => onSelectZone?.(zone.id) : undefined}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={
                clickable
                  ? `${zone.label}${priced ? `, ${formatMyr(zone.price ?? 0)}` : ", unpriced"}`
                  : undefined
              }
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectZone?.(zone.id);
                      }
                    }
                  : undefined
              }
            >
              <ShapeEl shape={zone.shape} />
              <text
                className="sm-zone-label"
                x={cx}
                y={priced ? cy - 14 : cy}
                textAnchor="middle"
                dominantBaseline="central"
              >
                {zone.label}
              </text>
              {priced && (
                <text
                  className="sm-zone-price"
                  x={cx}
                  y={cy + 20}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {zone.soldOut ? "SOLD OUT" : formatMyr(zone.price ?? 0)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default SeatMap;
