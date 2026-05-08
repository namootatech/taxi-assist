"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        style: {
          borderColor: "var(--border)",
          background: "var(--surface-1)",
          color: "var(--foreground)",
          boxShadow: "var(--shadow)",
        },
      }}
    />
  );
}

