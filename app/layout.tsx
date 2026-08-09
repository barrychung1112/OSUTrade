import type { Metadata } from "next";
import Script from "next/script";
import "@radix-ui/themes/styles.css";
import "./globals.css";
import Providers from "./providers";
import {
  GA_MEASUREMENT_ID,
  shouldEnableGoogleAnalytics,
} from "./lib/googleAnalytics";
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
  const analyticsEnabled = shouldEnableGoogleAnalytics(process.env.VERCEL_ENV);

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
        {analyticsEnabled ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        ) : null}
      </body>
    </html>
  );
}
