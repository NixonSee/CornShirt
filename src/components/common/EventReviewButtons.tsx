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
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(
    null,
  );
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(action: "approve" | "reject", body?: { reason: string }) {
    setIsSubmitting(true);
    setError("");

    const res = await fetch(`/api/admin/events/${eventId}/${action}`, {
      method: "PUT",
      ...(body
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });

    setIsSubmitting(false);

    if (res.ok) {
      setConfirmAction(null);
      setReasonModalOpen(false);
      setReason("");
      router.refresh();
    } else {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      setError(err.error || "Something went wrong");
    }
  }

  function handleConfirm() {
    if (!confirmAction) return;

    if (confirmAction === "reject") {
      setConfirmAction(null);
      setError("");
      setReasonModalOpen(true);
      return;
    }

    void submit("approve");
  }

  function closeReasonModal() {
    if (isSubmitting) return;
    setReasonModalOpen(false);
    setReason("");
    setError("");
  }

  return (
    <>
      <Button
        variant="success"
        icon={<CheckCircle2 size={16} />}
        onClick={() => setConfirmAction("approve")}
      >
        Approve
      </Button>
      <Button
        variant="destructive"
        icon={<XCircle size={16} />}
        onClick={() => setConfirmAction("reject")}
      >
        Reject
      </Button>

      <Modal
        isOpen={!!confirmAction}
        onClose={() => !isSubmitting && setConfirmAction(null)}
        title={confirmAction === "approve" ? "Approve Event" : "Reject Event"}
        actions={
          <>
            <Button
              variant="primary"
              onClick={() => setConfirmAction(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === "approve" ? "success" : "destructive"}
              onClick={handleConfirm}
              loading={isSubmitting}
            >
              {confirmAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </>
        }
      >
        {confirmAction === "approve"
          ? `Approve "${eventName}"? This will make the event visible to all users.`
          : `Reject "${eventName}"? The event will be set to rejected status.`}
        {error && confirmAction === "approve" ? (
          <p role="alert" className="customer-account-error">
            {error}
          </p>
        ) : null}
      </Modal>

      <Modal
        isOpen={reasonModalOpen}
        onClose={closeReasonModal}
        title={`Reject "${eventName}"`}
        className="cancel-event-modal"
        showCloseButton
        actions={
          <>
            <Button
              variant="outline"
              onClick={closeReasonModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={isSubmitting}
              onClick={() => void submit("reject", { reason })}
            >
              Reject Event
            </Button>
          </>
        }
      >
        <label className="cancel-event-reason">
          <span className="cancel-event-reason-label">
            <strong>Reason for rejection</strong>
            <small>Optional</small>
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="For example: Incomplete event details"
          />
          <small>
            If provided, this is saved with the event record and emailed to the
            organizer.
          </small>
        </label>
        {error ? (
          <p role="alert" className="customer-account-error">
            {error}
          </p>
        ) : null}
      </Modal>
    </>
  );
}
