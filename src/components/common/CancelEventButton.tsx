"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "./Button";
import { Modal } from "./Modal";

interface CancelEventButtonProps {
  eventName: string;
  cancelUrl: string;
}

export function CancelEventButton({
  eventName,
  cancelUrl,
}: CancelEventButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirm() {
    setIsSubmitting(true);
    setError("");

    const res = await fetch(cancelUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    setIsSubmitting(false);

    if (res.ok) {
      setIsOpen(false);
      setReason("");
      router.refresh();
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Event could not be cancelled.");
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        icon={<Ban size={16} />}
        onClick={() => setIsOpen(true)}
      >
        Cancel event
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setError("");
        }}
        title={`Cancel "${eventName}"?`}
        className="cancel-event-modal"
        showCloseButton
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Keep event
            </Button>
            <Button
              variant="destructive"
              loading={isSubmitting}
              onClick={handleConfirm}
            >
              Confirm cancellation
            </Button>
          </>
        }
      >
        <div className="cancel-event-warning">
          <span className="cancel-event-warning-icon" aria-hidden="true">
            <Ban size={18} />
          </span>
          <div>
            <strong>This action is permanent</strong>
            <p>
              Ticket sales will stop and all active tickets will become
              eligible for a refund.
            </p>
          </div>
        </div>

        <label className="cancel-event-reason">
          <span className="cancel-event-reason-label">
            <strong>Reason for cancellation</strong>
            <small>Optional</small>
          </span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="For example: Venue unavailable"
          />
          <small>This will be saved in the admin activity logs.</small>
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
