"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { useI18n } from "../i18n";
import {
  detectEmbeddedAuthBrowser,
  type EmbeddedAuthBrowser,
} from "../lib/embeddedBrowser";
import GoogleSignInButton from "./GoogleSignInButton";

type AuthProvidersResponse = {
  google?: boolean;
};

export default function GoogleAuthDialogCta({ redirectTo }: { redirectTo: string }) {
  const { t } = useI18n();
  const [showGoogle, setShowGoogle] = useState(false);
  const [embeddedBrowser, setEmbeddedBrowser] =
    useState<EmbeddedAuthBrowser | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProviderStatus() {
      try {
        const response = await fetch("/api/auth/provider-status", {
          cache: "no-store",
        });
        const providers = (await response.json()) as AuthProvidersResponse;

        if (!ignore) {
          setShowGoogle(Boolean(providers.google));
        }
      } catch {
        if (!ignore) {
          setShowGoogle(false);
        }
      }
    }

    loadProviderStatus();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    setEmbeddedBrowser(detectEmbeddedAuthBrowser(window.navigator.userAgent));
  }, []);

  async function copyCurrentLink() {
    if (!window.navigator.clipboard) {
      return;
    }

    await window.navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (!showGoogle) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      {embeddedBrowser?.isEmbedded && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <div className="flex gap-3">
            <ExternalLink
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#d73f09]"
            />
            <div className="min-w-0 space-y-2">
              <div className="font-semibold">
                {t("auth.embeddedBrowserTitle")}
              </div>
              <p className="leading-6 text-amber-900">
                {t("auth.embeddedBrowserBody", {
                  appName: embeddedBrowser.appName ?? "this app",
                })}
              </p>
              <button
                type="button"
                onClick={copyCurrentLink}
                className="inline-flex min-h-9 items-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-sm font-semibold text-[#8f2805] shadow-sm transition hover:border-[#d73f09] hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2"
              >
                <Copy aria-hidden="true" className="h-4 w-4" />
                <span>
                  {copied ? t("auth.linkCopied") : t("auth.copyCurrentLink")}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
      <GoogleSignInButton redirectTo={redirectTo} />
      <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
        <span className="h-px flex-1 bg-gray-200" />
        <span>{t("auth.orContinueWithEmail")}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
    </div>
  );
}
