"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall back below
  }
  // Fallback for older browsers / non-secure contexts
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export function ShareActions({ path, title, text }: { path: string; title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const getUrl = () => new URL(path, window.location.origin).toString();

  async function handleCopy() {
    const ok = await copyText(getUrl());
    if (ok) {
      setCopied(true);
      toast.success("Product link copied");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Could not copy the link. Please copy it from the address bar.");
    }
  }

  async function handleShare() {
    const url = getUrl();
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if ((error as DOMException)?.name === "AbortError") return;
      }
    }
    await handleCopy();
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" variant="outline" onClick={handleShare} className="h-11">
        <Share2 /> Share
      </Button>
      <Button type="button" variant="outline" onClick={handleCopy} className="h-11">
        {copied ? <Check className="text-success" /> : <Link2 />}
        {copied ? "Copied!" : "Copy link"}
      </Button>
    </div>
  );
}
