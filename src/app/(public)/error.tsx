"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-16">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="We couldn't load this page. Please try again — if it keeps happening, contact us on WhatsApp."
      >
        <Button onClick={() => retry()}>
          <RefreshCw /> Try again
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to homepage</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
