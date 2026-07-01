"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button, SearchBar, Pagination, Dropdown } from "@/components/common";
import { PartnerApplicationsTable } from "./PartnerApplicationsTable";

const PAGE_SIZE = 10;

interface DocumentInfo {
  document_id: string;
  file_name: string;
  file_path: string;
  document_type: string;
  file_size: number | null;
  mime_type: string | null;
  download_url: string | null;
}

interface ApplicationDisplay {
  application_id: string;
  applicant_name: string;
  applicant_email: string;
  phone: string;
  company_name: string;
  business_reg_no: string;
  tax_id: string;
  website: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  status: string;
  review_notes: string | null;
  created_at: string;
  documents: DocumentInfo[];
}

interface Props {
  applications: ApplicationDisplay[];
}

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

export function PartnerApplicationsPageClient({ applications }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    let result = applications;

    if (statusFilter) {
      result = result.filter((a) => a.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.applicant_name.toLowerCase().includes(q) ||
          a.applicant_email.toLowerCase().includes(q) ||
          a.company_name.toLowerCase().includes(q),
      );
    }

    result = [...result].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [applications, search, statusFilter, sortOrder]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const displayApps = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [filtered, currentPage],
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
          placeholder="Search by name, email, or company..."
        />

        <Dropdown
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setCurrentPage(1);
          }}
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

      <PartnerApplicationsTable
        applications={displayApps}
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
