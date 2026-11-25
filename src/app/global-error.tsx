"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-surface p-6 font-sans">
        <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="mt-2 text-muted-foreground">
            The website hit an unexpected problem. Please try again in a moment.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => retry()}
              className="h-11 rounded-lg bg-primary px-5 font-semibold text-primary-foreground"
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className="flex h-11 items-center justify-center rounded-lg border border-border px-5 font-semibold">
              Go to homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
