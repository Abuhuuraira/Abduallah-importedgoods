import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getSiteSettings } from "@/lib/data/public";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = `${settings.businessName} — Wholesale Imported Goods in Pakistan`;

  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: title,
      template: `%s | ${settings.businessName}`,
    },
    description: settings.welcomeText,
    applicationName: settings.businessName,
    keywords: [
      "imported goods",
      "wholesale",
      "Pakistan",
      "electronics",
      "home appliances",
      "kitchen items",
      "mobile accessories",
      settings.businessName,
    ],
    openGraph: {
      type: "website",
      locale: "en_PK",
      siteName: settings.businessName,
      title,
      description: settings.welcomeText,
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: settings.welcomeText,
    },
    appleWebApp: {
      capable: true,
      title: settings.businessName,
      statusBarStyle: "default",
    },
    icons: {
      icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#14254a",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="flex min-h-dvh flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
