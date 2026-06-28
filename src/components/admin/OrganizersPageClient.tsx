"use client";

import { useState, useMemo } from "react";
import { SearchBar } from "@/components/common";

interface Organizer {
  user_id: string;
  name: string;
  email: string;
  wallet_address?: string | null;
  stats: { total: number; active: number; pending: number };
}

interface Props {
  organizers: Organizer[];
}

const thStyle = { color: "#a0a0a0", fontSize: 13 } as const;
const mutedStyle = { color: "#a0a0a0" };

export function OrganizersPageClient({ organizers }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return organizers;
    const q = search.toLowerCase();
    return organizers.filter((org) => org.name.toLowerCase().includes(q));
  }, [organizers, search]);

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
          onChange={setSearch}
          placeholder="Search by organizer name..."
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ textAlign: "left", padding: "20px 0", ...mutedStyle }}>
          {search ? "No organizers match your search." : "No organizers registered yet."}
        </p>
      ) : (
        <div className="table-card" style={{ marginTop: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Wallet Address</th>
                <th style={thStyle}>Total Events</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Pending</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr key={org.user_id}>
                  <td>
                    <strong style={{ color: "var(--primary)" }}>
                      {org.name}
                    </strong>
                  </td>
                  <td>{org.email}</td>
                  <td>
                    {org.wallet_address || (
                      <span style={{ fontSize: 13, ...mutedStyle }}>
                        Not set
                      </span>
                    )}
                  </td>
                  <td>{org.stats.total}</td>
                  <td>
                    <span className="status good">ACTIVE</span> {org.stats.active}
                  </td>
                  <td>
                    {org.stats.pending > 0 && (
                      <>
                        <span className="status warn">PENDING</span>{" "}
                        {org.stats.pending}
                      </>
                    )}
                    {org.stats.pending === 0 && org.stats.active === 0 && (
                      <span style={{ fontSize: 13, ...mutedStyle }}>
                        No events
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
