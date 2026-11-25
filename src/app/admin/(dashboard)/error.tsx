"use client";

import Link from "next/link";
import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error instanceof Error && "digest" in error ? String((error as { digest?: string }).digest ?? "") : "";

  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong"
      description={`This page could not be loaded. Check your internet connection and that the database is set up (see DEPLOYMENT.md).${digest ? ` Error reference: ${digest}` : ""}`}
    >
      <Button onClick={() => retry()}>
        <RefreshCw /> Try again
      </Button>
      <Button asChild variant="outline">
        <Link href="/admin">Back to dashboard</Link>
      </Button>
    </EmptyState>
  );
}
