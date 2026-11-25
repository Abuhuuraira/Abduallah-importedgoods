"use client";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_INPUT_BYTES,
  MAX_IMAGE_STORED_BYTES,
  STORAGE_BUCKET,
} from "@/lib/constants";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export type UploadFolder = "products" | "branding";

export type UploadedImage = {
  path: string;
  publicUrl: string;
  /** Size actually uploaded (after compression), in bytes. */
  size: number;
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateImageFile(file: File): string | null {
  const type = file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk = (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type);
  const extOk = ["jpg", "jpeg", "png", "webp"].includes(ext);
  if (!typeOk || !extOk) return "Please choose a JPG, JPEG, PNG or WebP image.";
  if (file.size === 0) return "This file is empty. Please choose another image.";
  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    return `This image is too large (${formatBytes(file.size)}). The maximum is ${formatBytes(MAX_IMAGE_INPUT_BYTES)}.`;
  }
  return null;
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img> decoding
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new Error("This image could not be read. It may be damaged — please try another file.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Resizes large photos to at most `maxDimension` px and re-encodes them as
 * WebP (or JPEG on browsers that cannot encode WebP). Small images that are
 * already optimized are uploaded unchanged.
 */
export async function compressImage(
  file: File,
  maxDimension = 1600,
): Promise<{ blob: Blob; type: string; ext: string }> {
  const source = await decodeImage(file);
  const width = "naturalWidth" in source ? source.naturalWidth : source.width;
  const height = "naturalHeight" in source ? source.naturalHeight : source.height;

  const originalExt = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const alreadySmall = Math.max(width, height) <= maxDimension && file.size <= 400 * 1024;
  if (alreadySmall) {
    if ("close" in source) source.close();
    return { blob: file, type: file.type, ext: originalExt };
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not process this image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);

  let blob = await canvasToBlob(canvas, "image/webp", 0.82);
  let type = "image/webp";
  let ext = "webp";

  if (!blob || blob.type !== "image/webp") {
    // Safari fallback: JPEG has no transparency, so paint a white background.
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    blob = await canvasToBlob(canvas, "image/jpeg", 0.85);
    type = "image/jpeg";
    ext = "jpg";
  }

  if ("close" in source) source.close();

  if (!blob) throw new Error("Your browser could not compress this image.");

  // Keep the original if compression did not help and it fits the limit.
  if (blob.size >= file.size && scale === 1 && file.size <= MAX_IMAGE_STORED_BYTES) {
    return { blob: file, type: file.type, ext: originalExt };
  }
  return { blob, type, ext };
}

/**
 * Uploads directly from the browser to Supabase Storage using the admin's own
 * session. Storage RLS policies only allow authorized admins to upload, and
 * the bucket enforces type and size limits on the server.
 * Uses XMLHttpRequest so we can report real upload progress.
 */
export async function uploadImage(
  file: File,
  folder: UploadFolder,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal,
): Promise<UploadedImage> {
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);

  const { blob, type, ext } = await compressImage(file);
  if (blob.size > MAX_IMAGE_STORED_BYTES) {
    throw new Error(
      `The image is still ${formatBytes(blob.size)} after compression. Please use a smaller image (max ${formatBytes(MAX_IMAGE_STORED_BYTES)}).`,
    );
  }

  const supabase = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Your session has expired. Please sign in again.");

  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const endpoint = `${supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${path}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", supabasePublishableKey);
    xhr.setRequestHeader("Content-Type", type);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=31536000");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      let message = `Upload failed (error ${xhr.status}).`;
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        const detail = body.message || body.error || "";
        if (/row-level security|unauthorized|jwt/i.test(detail)) {
          message = "You are not allowed to upload images. Please sign in again as an admin.";
        } else if (/mime|type/i.test(detail)) {
          message = "This image type is not allowed. Use JPG, PNG or WebP.";
        } else if (/size|large/i.test(detail)) {
          message = "This image is too large to upload.";
        } else if (detail) {
          message = `Upload failed: ${detail}`;
        }
      } catch {
        // keep generic message
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading. Check your internet connection and try again."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));

    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(blob);
  });

  const publicUrl = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  return { path, publicUrl, size: blob.size };
}
