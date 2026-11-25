import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories, getAdminProduct, getAdminSettings } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Edit Product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]/edit">) {
  await requireAdmin();
  const { id } = await params;
  const [product, categories, settings] = await Promise.all([
    getAdminProduct(id),
    getAdminCategories(),
    getAdminSettings(),
  ]);
  if (!product) notFound();

  return (
    <>
      <PageHeader
        title={`Edit ${product.product_code}`}
        description={product.name}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/products">
                <ArrowLeft /> Back
              </Link>
            </Button>
            <ProductRowActions product={product} afterDeleteHref="/admin/products" />
          </>
        }
      />
      {/* Re-mount the form whenever the product changes on the server */}
      <ProductForm key={`${product.id}:${product.version}`} product={product} categories={categories} currency={settings.currency} />
    </>
  );
}
