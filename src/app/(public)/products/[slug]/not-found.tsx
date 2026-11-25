import Link from "next/link";
import { PackageX } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={PackageX}
        title="This product is no longer available"
        description="It may have been removed or the link may be incorrect. Browse our latest stock instead."
      >
        <Button asChild>
          <Link href="/products">Browse all products</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go to homepage</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
