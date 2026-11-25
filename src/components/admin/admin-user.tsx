import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";
import { getSession } from "@/lib/auth";

/** Shows the signed-in admin and a sign-out button. Reads cookies → render inside <Suspense>. */
export async function AdminUser({ compact = false }: { compact?: boolean }) {
  const session = await getSession();
  if (!session.user) return null;

  return (
    <div className="flex items-center gap-2">
      {!compact && (
        <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-muted/60 px-3 py-2">
          <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate text-xs font-medium" title={session.user.email}>
            {session.user.email}
          </span>
        </div>
      )}
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size={compact ? "icon" : "icon"} aria-label="Sign out" title="Sign out">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}
