import type { NextConfig } from "next";

/**
 * Allow next/image to optimize images stored in Supabase Storage.
 * The project URL comes from the environment so a custom Supabase domain
 * (or a local Supabase instance) also works.
 */
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
  {
    protocol: "https",
    hostname: "*.supabase.co",
    pathname: "/storage/v1/object/public/**",
  },
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

/**
 * Only when Supabase itself runs on this machine (Supabase CLI: http://127.0.0.1:54321)
 * must the image optimizer be allowed to fetch from a local address.
 * Never enabled for a hosted *.supabase.co project.
 */
const isLocalSupabase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(supabaseUrl ?? "");

if (supabaseUrl) {
  try {
    remotePatterns.push(
      new URL(`${supabaseUrl.replace(/\/+$/, "")}/storage/v1/object/public/**`),
    );
  } catch {
    // Invalid URL — ignored here, reported at runtime by src/lib/env.ts
  }
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns,
    formats: ["image/avif", "image/webp"],
    // Product images are immutable (every upload gets a new file name)
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowLocalIP: isLocalSupabase,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
