import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories, getAdminSettings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Add Product" };

export default async function NewProductPage() {
  await requireAdmin();
  const [categories, settings] = await Promise.all([getAdminCategories(), getAdminSettings()]);

  return (
    <>
      <PageHeader
        title="Add new product"
        description="Upload a photo, fill in the details and publish. The product ID is created automatically."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/products">
              <ArrowLeft /> Back to products
            </Link>
          </Button>
        }
      />
      <ProductForm categories={categories} currency={settings.currency} />
    </>
  );
}
