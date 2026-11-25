import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/auth";
import { getAdminCategories } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdmin();
  const categories = await getAdminCategories();
  return (
    <>
      <PageHeader
        title="Categories"
        description="Customers use categories to filter products. Product counts include drafts."
      />
      <CategoryManager categories={categories} />
    </>
  );
}
