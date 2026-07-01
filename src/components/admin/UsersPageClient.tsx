"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button, SearchBar, Pagination, Dropdown } from "@/components/common";
import { UsersTable } from "./UsersTable";

const PAGE_SIZE = 10;

interface UserDisplay {
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  wallet_address: string | null;
  created_at: string;
  deactivated_at: string | null;
  deactivated_by: string | null;
  deactivation_reason: string | null;
}

interface Props {
  users: UserDisplay[];
  currentUserId: string | null;
}

function roleSortPriority(role: string): number {
  switch (role) {
    case "customer":
    case "user":
      return 0;
    case "organizer":
      return 1;
    case "admin":
      return 2;
    default:
      return 3;
  }
}

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "organizer", label: "Organizer" },
  { value: "customer", label: "Customer" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "deactivated", label: "Deactivated" },
];

export function UsersPageClient({ users, currentUserId }: Props) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = users;

    if (roleFilter === "customer") {
      result = result.filter((u) => u.role === "customer" || u.role === "user");
    } else if (roleFilter) {
      result = result.filter((u) => u.role === roleFilter);
    }

    if (statusFilter) {
      result = result.filter((u) => u.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      const roleDiff = roleSortPriority(a.role) - roleSortPriority(b.role);
      if (roleDiff !== 0) return roleDiff;
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [users, search, roleFilter, statusFilter, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const displayUsers = useMemo(
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
          placeholder="Search by name or email..."
        />

        <Dropdown
          value={roleFilter}
          onChange={(v) => { setRoleFilter(v); setCurrentPage(1); }}
          options={ROLE_OPTIONS}
          placeholder="All Roles"
        />

        <Dropdown
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}
          options={STATUS_OPTIONS}
          placeholder="All Status"
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

      <UsersTable users={displayUsers} currentUserId={currentUserId} />

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
