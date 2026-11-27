"use client";

import { useEffect, useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { setLikeAction, type LikeState } from "@/lib/actions/storefront";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getVisitorId } from "@/lib/visitor-id";

/**
 * Heart button with the live like count. One like per browser; tap again to
 * unlike. The count is read straight from Supabase (cheap, always fresh);
 * changes go through a Server Action so the admin can be notified.
 */
export function LikeButton({ productId, className }: { productId: string; className?: string }) {
  const [state, setState] = useState<LikeState | null>(null);
  const [hidden, setHidden] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    fetch(`${supabaseUrl}/rest/v1/rpc/get_like_state`, {
      method: "POST",
      headers: { apikey: supabasePublishableKey, "Content-Type": "application/json" },
      body: JSON.stringify({ p_product_id: productId, p_visitor_id: getVisitorId().id }),
      credentials: "omit",
      cache: "no-store",
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as { liked?: unknown; count?: unknown };
      })
      .then((data) => {
        if (!cancelled) setState({ liked: data?.liked === true, count: Number(data?.count) || 0 });
      })
      .catch(() => {
        // Likes not set up yet (or offline): hide the button rather than show a broken one.
        if (!cancelled) setHidden(true);
      });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (!isSupabaseConfigured || hidden) return null;

  const toggle = () => {
    if (!state || pending) return;
    const previous = state;
    const liked = !state.liked;
    setState({ liked, count: Math.max(0, state.count + (liked ? 1 : -1)) });
    startTransition(async () => {
      const result = await setLikeAction(productId, getVisitorId().id, liked);
      if (result.ok && result.data) {
        setState(result.data);
      } else {
        setState(previous);
        if (!result.ok && result.code === "NOT_INSTALLED") setHidden(true);
        else toast.error(result.ok ? "Could not save your like." : result.error);
      }
    });
  };

  const liked = state?.liked ?? false;
  const count = state?.count ?? 0;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!state}
      aria-pressed={liked}
      aria-label={liked ? `Unlike this product (${count} likes)` : `Like this product (${count} likes)`}
      data-testid="like-button"
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
        liked
          ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
          : "border-border bg-background text-foreground hover:bg-muted",
        className,
      )}
    >
      <Heart className={cn("size-5 transition-transform", liked && "scale-110 fill-current")} aria-hidden="true" />
      <span>{liked ? "Liked" : "Like"}</span>
      <span
        className={cn(
          "min-w-6 rounded-full px-1.5 py-0.5 text-center text-xs tabular-nums",
          liked ? "bg-rose-100" : "bg-muted",
        )}
        data-testid="like-count"
      >
        {state ? formatCount(count) : "·"}
      </span>
    </button>
  );
}
