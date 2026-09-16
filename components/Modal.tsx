"use client";

import { type ReactNode } from "react";

export default function Modal({
  title,
  onClose,
  children,
  width = "max-w-md",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full ${width} rounded-xl border border-border bg-surface p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-text-muted hover:bg-surface-2 hover:text-text"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
