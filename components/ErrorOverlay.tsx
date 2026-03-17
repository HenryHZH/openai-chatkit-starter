"use client";

import type { ReactNode } from "react";

type ErrorOverlayProps = {
  error: string | null;
  fallbackMessage?: ReactNode;
  onRetry?: (() => void) | null;
  retryLabel?: string;
};

export function ErrorOverlay({
  error,
  fallbackMessage,
  onRetry,
  retryLabel,
}: ErrorOverlayProps) {
  if (!error && !fallbackMessage) {
    return null;
  }

  const content = error ?? fallbackMessage;

  if (!content) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid h-full w-full place-items-center rounded-[inherit] bg-[color-mix(in_oklab,var(--surface-raised)_75%,transparent)] p-5 text-center backdrop-blur-md">
      <div className="pointer-events-auto mx-auto w-full max-w-lg rounded-[1.1rem] border border-[var(--border-soft)] bg-[color-mix(in_oklab,var(--surface-raised)_94%,transparent)] px-6 py-5 text-base leading-7 text-[var(--ink-780)] shadow-[var(--shadow-soft)]">
        <p role={error ? "alert" : "status"}>{content}</p>
        {error && onRetry ? (
          <button
            type="button"
            className="control-pill mt-4"
            data-variant="primary"
            onClick={onRetry}
          >
            {retryLabel ?? "Restart chat"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
