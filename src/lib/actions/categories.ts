"use server";

import { refresh, updateTag } from "next/cache";
import { getAdminForAction } from "@/lib/auth";
import { CACHE_TAGS } from "@/lib/constants";
import { nextAvailableSlug, slugify } from "@/lib/slug";
import {
  categoryDeleteSchema,
  categorySchema,
  categoryUpdateSchema,
  fieldErrorsOf,
} from "@/lib/validation";
import type { ActionResult } from "@/types";
import { UNAUTHORIZED, dbErrorMessage, isUniqueViolation, takenCategorySlugs } from "./helpers";

const DUPLICATE_NAME: ActionResult<never> = {
  ok: false,
  error: "A category with this name already exists.",
  fieldErrors: { name: ["This name is already used."] },
};

function revalidateCategories() {
  updateTag(CACHE_TAGS.categories);
  updateTag(CACHE_TAGS.products);
}

export async function createCategoryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted field.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const { name } = parsed.data;
  const base = slugify(name, "category");

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = nextAvailableSlug(base, await takenCategorySlugs(supabase, base));
    const { error } = await supabase.from("categories").insert({ name, slug });
    if (!error) {
      revalidateCategories();
      refresh();
      return { ok: true, message: `Category “${name}” was added.` };
    }
    if (isUniqueViolation(error, "categories_name_lower_key")) return DUPLICATE_NAME;
    if (isUniqueViolation(error, "categories_slug_key")) continue;
    return { ok: false, error: dbErrorMessage(error, "add the category") };
  }
  return { ok: false, error: "Could not add the category. Please try again." };
}

export async function updateCategoryAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  const parsed = categoryUpdateSchema.safeParse({ id: formData.get("id"), name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted field.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const { id, name } = parsed.data;
  const base = slugify(name, "category");

  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = nextAvailableSlug(base, await takenCategorySlugs(supabase, base, id));
    const { data, error } = await supabase
      .from("categories")
      .update({ name, slug })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (!error) {
      if (!data) return { ok: false, code: "NOT_FOUND", error: "This category was deleted by another admin." };
      revalidateCategories();
      refresh();
      return { ok: true, message: `Category renamed to “${name}”.` };
    }
    if (isUniqueViolation(error, "categories_name_lower_key")) return DUPLICATE_NAME;
    if (isUniqueViolation(error, "categories_slug_key")) continue;
    return { ok: false, error: dbErrorMessage(error, "rename the category") };
  }
  return { ok: false, error: "Could not rename the category. Please try again." };
}

export async function deleteCategoryAction(input: {
  id: string;
  moveProducts?: boolean;
  targetCategoryId?: string | null;
}): Promise<ActionResult<{ productCount?: number; moved?: number }>> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  const parsed = categoryDeleteSchema.safeParse({
    id: input.id,
    moveProducts: Boolean(input.moveProducts),
    targetCategoryId: input.targetCategoryId || null,
  });
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { id, moveProducts, targetCategoryId } = parsed.data;

  const { data, error } = await supabase.rpc("delete_category", {
    p_category_id: id,
    p_move_products: moveProducts,
    p_target_category_id: targetCategoryId,
  });

  if (error) {
    if (error.message.includes("CATEGORY_HAS_PRODUCTS")) {
      const count = Number.parseInt(error.details ?? "", 10) || 0;
      refresh();
      return {
        ok: false,
        code: "CATEGORY_HAS_PRODUCTS",
        error: `This category still has ${count} product${count === 1 ? "" : "s"}. Choose where to move them first.`,
      };
    }
    if (error.code === "P0002" || error.code === "22023") {
      refresh();
      return { ok: false, error: error.message };
    }
    if (error.code === "23503") {
      return { ok: false, error: "A product was just added to this category. Please try again." };
    }
    return { ok: false, error: dbErrorMessage(error, "delete the category") };
  }

  const moved = Number(data) || 0;
  revalidateCategories();
  refresh();
  return {
    ok: true,
    message: moved > 0 ? `Category deleted. ${moved} product${moved === 1 ? " was" : "s were"} moved.` : "Category deleted.",
    data: { moved },
  };
}
