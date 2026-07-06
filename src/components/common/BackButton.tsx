"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="button-secondary"
      onClick={() => router.back()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        cursor: "pointer",
        border: "none",
      }}
    >
      <ArrowLeft size={16} />
      Back
    </button>
  );
}
