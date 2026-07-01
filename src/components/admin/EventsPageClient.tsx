"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button, SearchBar, Pagination, Dropdown } from "@/components/common";
import { EventsTable } from "./EventsTable";

const PAGE_SIZE = 10;

interface EventDisplay {
  event_id: string;
  event_name: string;
  organizer_name?: string;
  organizer_id?: string;
  status: string;
  ticket_type_count: number;
  total_supply: number;
  created_at: string;
  event_date?: string;
}

interface OrganizerInfo {
  user_id: string;
  name: string;
}

interface Props {
  events: EventDisplay[];
  organizers: OrganizerInfo[];
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },

  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export function EventsPageClient({ events, organizers }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [organizerFilter, setOrganizerFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = events;

    if (statusFilter !== "all") {
      result = result.filter((ev) => ev.status === statusFilter);
    }

    if (organizerFilter) {
      result = result.filter((ev) => ev.organizer_id === organizerFilter);
    }

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
  }, [events, search, statusFilter, organizerFilter, sortOrder]);

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
          flexWrap: "wrap",
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

        <Dropdown
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
          options={STATUS_OPTIONS}
          placeholder="All Statuses"
        />

        <Dropdown
          value={organizerFilter}
          onChange={(v) => { setOrganizerFilter(v); setCurrentPage(1); }}
          options={[
            { value: "", label: "All Organizers" },
            ...organizers.map((o) => ({ value: o.user_id, label: o.name })),
          ]}
          placeholder="All Organizers"
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

      <EventsTable
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
