"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button, SearchBar, Pagination } from "@/components/common";
import { PendingEventsTable } from "./PendingEventsTable";

const PAGE_SIZE = 10;

interface PendingEvent {
  event_id: string;
  event_name: string;
  organizer_name?: string;
  ticket_type_count: number;
  total_supply: number;
  created_at: string;
}

interface Props {
  events: PendingEvent[];
}

export function PendingEventsPageClient({ events }: Props) {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = events;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (ev) =>
          ev.event_name.toLowerCase().includes(q) ||
          (ev.organizer_name || "").toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [events, search, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const displayEvents = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [filtered, currentPage]
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setCurrentPage(1);
          }}
          placeholder="Search by event or organizer..."
        />
        <Button
          variant="outline"
          icon={<ArrowUpDown size={16} />}
          onClick={() =>
            setSortOrder((o) => (o === "newest" ? "oldest" : "newest"))
          }
        >
          {sortOrder === "newest" ? "Newest first" : "Oldest first"}
        </Button>
      </div>

      <PendingEventsTable
        events={displayEvents}
        sortOrder={sortOrder}
        onSortChange={() =>
          setSortOrder((o) => (o === "newest" ? "oldest" : "newest"))
        }
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
      />
    </>
  );
}
