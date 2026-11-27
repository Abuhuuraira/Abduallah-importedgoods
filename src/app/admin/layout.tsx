import type { Metadata } from "next";

/**
 * Every /admin page (including the login page) points phones to the admin
 * app manifest, so "Add to Home Screen" from here creates an "AIG Admin" icon
 * that opens the admin panel — separate from the customer website icon.
 */
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "AIG Admin", statusBarStyle: "default" },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
