type EmbeddedBrowserMatch = {
  pattern: RegExp;
  appName: string;
};

const EMBEDDED_BROWSER_MATCHES: EmbeddedBrowserMatch[] = [
  { pattern: /Line\//i, appName: "LINE" },
  { pattern: /Instagram/i, appName: "Instagram" },
  { pattern: /FBAN|FBAV|FBIOS|FB_IAB/i, appName: "Facebook" },
  { pattern: /MicroMessenger/i, appName: "WeChat" },
  { pattern: /LinkedInApp/i, appName: "LinkedIn" },
];

export type EmbeddedAuthBrowser = {
  isEmbedded: boolean;
  appName: string | null;
};

export function detectEmbeddedAuthBrowser(userAgent: string): EmbeddedAuthBrowser {
  const normalizedUserAgent = userAgent.trim();

  for (const match of EMBEDDED_BROWSER_MATCHES) {
    if (match.pattern.test(normalizedUserAgent)) {
      return {
        isEmbedded: true,
        appName: match.appName,
      };
    }
  }

  const isAndroidWebView = /; wv\)/i.test(normalizedUserAgent);
  const isIosWebView =
    /\b(iPhone|iPad|iPod)\b/i.test(normalizedUserAgent) &&
    /AppleWebKit/i.test(normalizedUserAgent) &&
    !/Safari/i.test(normalizedUserAgent) &&
    !/CriOS|FxiOS|EdgiOS/i.test(normalizedUserAgent);

  if (isAndroidWebView || isIosWebView) {
    return {
      isEmbedded: true,
      appName: "in-app browser",
    };
  }

  return {
    isEmbedded: false,
    appName: null,
  };
}
