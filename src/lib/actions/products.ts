"use server";

import { refresh, updateTag } from "next/cache";
import { getAdminForAction } from "@/lib/auth";
import { CACHE_TAGS, LOGO_PATH_REGEX, PRODUCT_IMAGE_PATH_REGEX } from "@/lib/constants";
import { nextAvailableSlug, slugify } from "@/lib/slug";
import { fieldErrorsOf, idSchema, productCreateSchema, productUpdateSchema } from "@/lib/validation";
import type { ActionResult, ProductStatus } from "@/types";
import {
  UNAUTHORIZED,
  dbErrorMessage,
  imageExists,
  isForeignKeyViolation,
  isUniqueViolation,
  publicImageUrl,
  removeImage,
  takenProductSlugs,
} from "./helpers";

type SavedProduct = { id: string; product_code: string; slug: string; version: number };

function productFormValues(formData: FormData) {
  return {
    id: formData.get("id") ?? undefined,
    version: formData.get("version") ?? undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    price: formData.get("price"),
    category_id: formData.get("category_id"),
    status: formData.get("status"),
    is_published: formData.get("is_published"),
    is_new_arrival: formData.get("is_new_arrival"),
    image_path: formData.get("image_path"),
  };
}

/** Customers see catalog changes right away (no stale cache). */
function revalidateCatalog() {
  updateTag(CACHE_TAGS.products);
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createProductAction(
  _prev: ActionResult<SavedProduct> | null,
  formData: FormData,
): Promise<ActionResult<SavedProduct>> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  const parsed = productCreateSchema.safeParse(productFormValues(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const input = parsed.data;

  if (!(await imageExists(supabase, input.image_path))) {
    return {
      ok: false,
      error: "The uploaded image could not be found. Please upload it again.",
      fieldErrors: { image_path: ["Please upload the image again."] },
    };
  }

  const baseSlug = slugify(input.name, "product");
  let slug = nextAvailableSlug(baseSlug, await takenProductSlugs(supabase, baseSlug));

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: input.name,
        slug,
        description: input.description,
        price: input.price,
        category_id: input.category_id,
        status: input.status,
        is_published: input.is_published,
        is_new_arrival: input.is_new_arrival,
        image_path: input.image_path,
        image_url: publicImageUrl(supabase, input.image_path),
      })
      .select("id, product_code, slug, version")
      .single();

    if (!error && data) {
      revalidateCatalog();
      return {
        ok: true,
        message: `${data.product_code} “${input.name}” was ${input.is_published ? "published" : "saved as a draft"}.`,
        data,
      };
    }

    if (isUniqueViolation(error, "products_slug_key")) {
      // Another product took this slug a moment ago — pick a new one and retry.
      slug = nextAvailableSlug(baseSlug, await takenProductSlugs(supabase, baseSlug));
      if (attempt === 1) slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
      continue;
    }
    if (isForeignKeyViolation(error)) {
      return {
        ok: false,
        error: "The selected category no longer exists. Please choose another one.",
        fieldErrors: { category_id: ["Choose another category."] },
      };
    }
    return { ok: false, error: dbErrorMessage(error!, "create the product") };
  }

  return { ok: false, error: "Could not create a unique link for this product. Please try again." };
}

// ---------------------------------------------------------------------------
// Update (optimistic concurrency: only succeeds if nobody else saved first)
// ---------------------------------------------------------------------------

export async function updateProductAction(
  _prev: ActionResult<SavedProduct> | null,
  formData: FormData,
): Promise<ActionResult<SavedProduct>> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  const parsed = productUpdateSchema.safeParse(productFormValues(formData));
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  const input = parsed.data;

  const { data: current, error: currentError } = await supabase
    .from("products")
    .select("id, image_path, version")
    .eq("id", input.id)
    .maybeSingle();

  if (currentError) return { ok: false, error: dbErrorMessage(currentError, "load the product") };
  if (!current) {
    return { ok: false, code: "NOT_FOUND", error: "This product was deleted by another admin." };
  }
  if (current.version !== input.version) {
    return {
      ok: false,
      code: "CONFLICT",
      error: "Another admin changed this product while you were editing. Reload the page to see the latest version, then make your changes again.",
    };
  }

  const imageChanged = current.image_path !== input.image_path;
  if (imageChanged && !(await imageExists(supabase, input.image_path))) {
    return {
      ok: false,
      error: "The new image could not be found. Please upload it again.",
      fieldErrors: { image_path: ["Please upload the image again."] },
    };
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      name: input.name,
      description: input.description,
      price: input.price,
      category_id: input.category_id,
      status: input.status,
      is_published: input.is_published,
      is_new_arrival: input.is_new_arrival,
      image_path: input.image_path,
      image_url: publicImageUrl(supabase, input.image_path),
    })
    .eq("id", input.id)
    .eq("version", input.version) // ← the concurrency guard
    .select("id, product_code, slug, version")
    .maybeSingle();

  if (error) {
    if (isForeignKeyViolation(error)) {
      return {
        ok: false,
        error: "The selected category no longer exists. Please choose another one.",
        fieldErrors: { category_id: ["Choose another category."] },
      };
    }
    return { ok: false, error: dbErrorMessage(error, "save the product") };
  }
  if (!data) {
    return {
      ok: false,
      code: "CONFLICT",
      error: "Another admin saved changes to this product a moment ago. Reload the page and try again.",
    };
  }

  if (imageChanged) await removeImage(supabase, current.image_path);

  revalidateCatalog();
  refresh();
  return { ok: true, message: `${data.product_code} was updated.`, data };
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteProductAction(id: string): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid product." };

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .select("product_code, image_path")
    .maybeSingle();

  if (error) return { ok: false, error: dbErrorMessage(error, "delete the product") };
  if (!data) return { ok: false, code: "NOT_FOUND", error: "This product was already deleted." };

  await removeImage(supabase, data.image_path);

  revalidateCatalog();
  refresh();
  return { ok: true, message: `${data.product_code} was deleted.` };
}

// ---------------------------------------------------------------------------
// Booking status (manual booking flow)
// The UPDATE only applies if the product is still in the opposite state, so
// two admins cannot silently overwrite each other's change.
// ---------------------------------------------------------------------------

export async function setProductStatusAction(id: string, status: ProductStatus): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  if (!idSchema.safeParse(id).success || (status !== "available" && status !== "booked")) {
    return { ok: false, error: "Invalid request." };
  }
  const from: ProductStatus = status === "booked" ? "available" : "booked";

  const { data, error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", id)
    .eq("status", from)
    .select("product_code")
    .maybeSingle();

  if (error) return { ok: false, error: dbErrorMessage(error, "change the status") };

  if (!data) {
    const { data: existing } = await supabase
      .from("products")
      .select("product_code, status")
      .eq("id", id)
      .maybeSingle();
    refresh();
    if (!existing) return { ok: false, code: "NOT_FOUND", error: "This product no longer exists." };
    return {
      ok: false,
      code: "CONFLICT",
      error: `${existing.product_code} is already marked as ${existing.status === "booked" ? "BOOKED" : "AVAILABLE"} (possibly by another admin).`,
    };
  }

  revalidateCatalog();
  refresh();
  return {
    ok: true,
    message:
      status === "booked"
        ? `${data.product_code} is now BOOKED. Customers can no longer book it.`
        : `${data.product_code} is AVAILABLE again.`,
  };
}

// ---------------------------------------------------------------------------
// Publish / unpublish
// ---------------------------------------------------------------------------

export async function setProductPublishedAction(id: string, publish: boolean): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  if (!idSchema.safeParse(id).success) return { ok: false, error: "Invalid product." };

  const { data, error } = await supabase
    .from("products")
    .update({ is_published: publish })
    .eq("id", id)
    .eq("is_published", !publish)
    .select("product_code")
    .maybeSingle();

  if (error) return { ok: false, error: dbErrorMessage(error, "update the product") };

  if (!data) {
    const { data: existing } = await supabase
      .from("products")
      .select("product_code, is_published")
      .eq("id", id)
      .maybeSingle();
    refresh();
    if (!existing) return { ok: false, code: "NOT_FOUND", error: "This product no longer exists." };
    return {
      ok: false,
      code: "CONFLICT",
      error: `${existing.product_code} is already ${existing.is_published ? "published" : "a draft"}.`,
    };
  }

  revalidateCatalog();
  refresh();
  return {
    ok: true,
    message: publish
      ? `${data.product_code} is now live on the website.`
      : `${data.product_code} was unpublished and is hidden from customers.`,
  };
}

// ---------------------------------------------------------------------------
// Clean up an image that was uploaded but never saved (e.g. replaced before
// saving, or the form was cancelled). Refuses to delete images in use.
// ---------------------------------------------------------------------------

export async function discardUploadedImageAction(path: string): Promise<ActionResult> {
  const admin = await getAdminForAction();
  if (!admin) return UNAUTHORIZED;
  const { supabase } = admin;

  if (typeof path !== "string" || !(PRODUCT_IMAGE_PATH_REGEX.test(path) || LOGO_PATH_REGEX.test(path))) {
    return { ok: false, error: "Invalid image path." };
  }

  const [{ count: productRefs }, { data: settings }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("image_path", path),
    supabase.from("admin_settings").select("logo_path").eq("id", 1).maybeSingle(),
  ]);

  if ((productRefs ?? 0) > 0 || settings?.logo_path === path) {
    return { ok: true, message: "Image is in use and was kept." };
  }

  await removeImage(supabase, path);
  return { ok: true };
}
