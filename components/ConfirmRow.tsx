"use client";
import { Sheet } from "./Sheet";

export function ConfirmDelete({
  open,
  title,
  description,
  onConfirm,
  onClose
}: {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="px-5 pb-6">
        {description && <p className="text-sm text-muted mb-4">{description}</p>}
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className="w-full bg-negative text-paper rounded-2xl py-3.5 text-sm font-medium"
        >
          delete
        </button>
        <button
          onClick={onClose}
          className="w-full bg-chip text-ink rounded-2xl py-3.5 text-sm font-medium mt-2"
        >
          cancel
        </button>
      </div>
    </Sheet>
  );
}
