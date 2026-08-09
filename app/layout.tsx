import type { Metadata } from "next";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import Providers from "./providers";
import {
  DEFAULT_SHARE_DESCRIPTION,
  DEFAULT_SHARE_IMAGE,
  SITE_URL,
} from "./lib/productMetadata";

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  title: {
    default: "OSUTrade | Campus Marketplace",
    template: "%s",
  },
  description: DEFAULT_SHARE_DESCRIPTION,
  openGraph: {
    title: "OSUTrade | Campus Marketplace",
    description: DEFAULT_SHARE_DESCRIPTION,
    siteName: "OSUTrade",
    type: "website",
    url: "/",
    images: [{ url: DEFAULT_SHARE_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OSUTrade | Campus Marketplace",
    description: DEFAULT_SHARE_DESCRIPTION,
    images: [DEFAULT_SHARE_IMAGE],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
