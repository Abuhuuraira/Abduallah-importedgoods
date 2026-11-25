import type { Metadata } from "next";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = {
  title: "You are offline",
  robots: { index: false, follow: false },
};

/** Shown by the service worker when there is no internet connection. */
export default function OfflinePage() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <WifiOff className="size-8" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold">You are offline</h1>
        <p className="mt-2 text-muted-foreground">
          Please check your internet connection. Prices and availability are always shown live, so we need a
          connection to display products.
        </p>
      </div>
    </div>
  );
}
