"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "./Button";
import { Modal } from "./Modal";

interface EventReviewButtonsProps {
  eventId: string;
  eventName: string;
}

export function EventReviewButtons({
  eventId,
  eventName,
}: EventReviewButtonsProps) {
  const router = useRouter();
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    if (!actionType) return;

    setIsSubmitting(true);

    const res = await fetch(`/api/admin/events/${eventId}/${actionType}`, {
      method: "PUT",
    });

    setIsSubmitting(false);
    setActionType(null);

    if (res.ok) {
      router.refresh();
    } else {
      const err = await res.json();
      alert(err.error || "Something went wrong");
    }
  }

  return (
    <>
      <Button
        variant="success"
        icon={<CheckCircle2 size={16} />}
        onClick={() => setActionType("approve")}
      >
        Approve
      </Button>
      <Button
        variant="destructive"
        icon={<XCircle size={16} />}
        onClick={() => setActionType("reject")}
      >
        Reject
      </Button>

      <Modal
        isOpen={!!actionType}
        onClose={() => !isSubmitting && setActionType(null)}
        title={actionType === "approve" ? "Approve Event" : "Reject Event"}
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setActionType(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "success" : "destructive"}
              onClick={handleConfirm}
              loading={isSubmitting}
            >
              {actionType === "approve" ? "Approve" : "Reject"}
            </Button>
          </>
        }
      >
        {actionType === "approve"
          ? `Approve "${eventName}"? This will make the event visible to all users.`
          : `Reject "${eventName}"? The event will be set to rejected status.`}
      </Modal>
    </>
  );
}
