"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, Modal } from "@/components/common";

interface PurchaseButtonProps {
  isCustomer: boolean;
  loginHref: string;
  ticketTypeName: string;
}

export default function PurchaseButton({
  isCustomer,
  loginHref,
  ticketTypeName,
}: PurchaseButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!isCustomer) {
    return (
      <Link className="button full" href={loginHref}>
        Buy ticket
      </Link>
    );
  }

  return (
    <>
      <Button fullWidth onClick={() => setIsOpen(true)}>
        Buy ticket
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Purchase service coming soon"
        actions={<Button onClick={() => setIsOpen(false)}>Close</Button>}
      >
        Purchasing {ticketTypeName} is not connected yet. No DICKEN has been
        charged and no ticket has been created.
      </Modal>
    </>
  );
}
