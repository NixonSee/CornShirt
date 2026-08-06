"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
  className?: string;
  showCloseButton?: boolean;
}

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return typeof document !== "undefined";
}

function getServerSnapshot() {
  return false;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  wide = false,
  className = "",
  showCloseButton = false,
}: ModalProps) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!isOpen) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={[
          "modal-card",
          wide ? "wide" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        {showCloseButton ? (
          <button
            type="button"
            className="modal-close-button"
            aria-label="Close modal"
            onClick={onClose}
          >
            <X aria-hidden="true" size={18} />
          </button>
        ) : null}
        <div className="modal-body">{children}</div>
        {actions ? <div className="modal-actions">{actions}</div> : null}
      </div>
    </div>,
    document.body
  );
}
