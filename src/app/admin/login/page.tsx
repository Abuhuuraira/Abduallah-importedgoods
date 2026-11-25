import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { LoginForm } from "@/components/admin/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && /^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(next) && next !== "/admin/login" ? next : "/admin";
}

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-navy text-gold shadow-soft">
            <LockKeyhole className="size-7" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-bold">Admin sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Authorized administrators only.</p>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
          <Suspense fallback={<LoginSkeleton />}>
            <LoginGate searchParams={searchParams} />
          </Suspense>
        </div>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to website
        </Link>
      </div>
    </main>
  );
}

async function LoginGate({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const params = await searchParams;
  const session = await getSession();
  const next = safeNext(params.next);

  if (session.user && session.isAdmin) redirect(next);

  return (
    <LoginForm
      next={next}
      configured={isSupabaseConfigured}
      nonAdminEmail={session.user && !session.isAdmin ? session.user.email : null}
      unauthorized={params.error === "unauthorized"}
    />
  );
}

function LoginSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}
