"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, ImagePlus, Loader2, RefreshCw, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { discardUploadedImageAction } from "@/lib/actions/products";
import { ACCEPTED_IMAGE_EXTENSIONS, MAX_IMAGE_INPUT_BYTES } from "@/lib/constants";
import { formatBytes, uploadImage, validateImageFile, type UploadFolder } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

type Stage = "idle" | "processing" | "uploading" | "done" | "error";

type ImageUploaderProps = {
  /** Name of the hidden input that carries the storage path to the server action. */
  name: string;
  folder: UploadFolder;
  label: string;
  initialPath?: string | null;
  initialUrl?: string | null;
  required?: boolean;
  removable?: boolean;
  error?: string;
  variant?: "product" | "logo";
  /** Reports whether an upload is in progress (to block form submission). */
  onBusyChange?: (busy: boolean) => void;
  /** Reports a newly uploaded (not yet saved) path, or null. */
  onPendingUploadChange?: (path: string | null) => void;
};

export function ImageUploader({
  name,
  folder,
  label,
  initialPath = null,
  initialUrl = null,
  required = false,
  removable = false,
  error,
  variant = "product",
  onBusyChange,
  onPendingUploadChange,
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [path, setPath] = useState<string>(initialPath ?? "");
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // A path uploaded in this session that has not been saved yet
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const busy = stage === "processing" || stage === "uploading";

  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);
  useEffect(() => onPendingUploadChange?.(pendingPath), [pendingPath, onPendingUploadChange]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handleFile(file: File) {
    const problem = validateImageFile(file);
    if (problem) {
      setStage("error");
      setMessage(problem);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPreview(URL.createObjectURL(file));
    setStage("processing");
    setProgress(0);
    setMessage("Optimizing image…");

    try {
      const uploaded = await uploadImage(
        file,
        folder,
        (pct) => {
          setStage("uploading");
          setProgress(pct);
          setMessage(`Uploading… ${pct}%`);
        },
        controller.signal,
      );

      // Clean up a previous unsaved upload that this one replaces
      if (pendingPath && pendingPath !== uploaded.path) {
        void discardUploadedImageAction(pendingPath);
      }

      setPath(uploaded.path);
      setUrl(uploaded.publicUrl);
      setPendingPath(uploaded.path);
      setStage("done");
      setProgress(100);
      setMessage(`Uploaded (${formatBytes(uploaded.size)}). Remember to save.`);
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      setStage("error");
      setMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setPreview(null);
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleRemove() {
    if (pendingPath) void discardUploadedImageAction(pendingPath);
    setPendingPath(null);
    setPath("");
    setUrl(null);
    setPreview(null);
    setStage("idle");
    setMessage(null);
  }

  const shownImage = preview ?? url;
  const isLogo = variant === "logo";
  const errorText = stage === "error" ? message : error;

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input type="hidden" name={name} value={path} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !busy) void handleFile(file);
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed bg-surface transition-colors",
          dragging ? "border-primary bg-primary/5" : errorText ? "border-destructive/50" : "border-border",
          isLogo ? "aspect-[3/1] max-w-sm" : "aspect-square w-full max-w-md",
        )}
      >
        {shownImage ? (
          <>
            {preview ? (
              // Local preview (blob: URL) — not optimizable by next/image
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Selected image preview" className="absolute inset-0 size-full object-contain p-2" />
            ) : (
              <Image src={shownImage} alt="Current image" fill sizes="448px" className="object-contain p-2" />
            )}
            {busy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/75 p-6 backdrop-blur-[2px]">
                <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
                <Progress value={stage === "processing" ? 5 : progress} className="h-2 w-full max-w-56" />
                <p className="text-sm font-medium" aria-live="polite">{message}</p>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center"
            disabled={busy}
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-background text-primary shadow-soft">
              {isLogo ? <ImagePlus className="size-7" /> : <UploadCloud className="size-7" />}
            </span>
            <span className="font-semibold">Tap to choose {isLogo ? "a logo" : "a photo"}</span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG or WebP · up to {formatBytes(MAX_IMAGE_INPUT_BYTES)} · large photos are compressed automatically
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">or drag &amp; drop it here</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={`${ACCEPTED_IMAGE_EXTENSIONS},image/jpeg,image/png,image/webp`}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
        disabled={busy}
      />

      <div className="flex flex-wrap items-center gap-2">
        {shownImage && (
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <RefreshCw /> Replace image
          </Button>
        )}
        {removable && shownImage && (
          <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={busy} className="text-destructive hover:text-destructive">
            <Trash2 /> Remove
          </Button>
        )}
        {stage === "done" && message && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-success" aria-live="polite">
            <CheckCircle2 className="size-4" /> {message}
          </span>
        )}
      </div>

      {errorText && (
        <p className="text-sm text-destructive" role="alert">
          {errorText}
        </p>
      )}
    </div>
  );
}
