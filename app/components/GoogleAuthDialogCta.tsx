"use client";

import { useEffect, useState } from "react";
import { useI18n } from "../i18n";
import GoogleSignInButton from "./GoogleSignInButton";

type AuthProvidersResponse = {
  google?: boolean;
};

export default function GoogleAuthDialogCta({ redirectTo }: { redirectTo: string }) {
  const { t } = useI18n();
  const [showGoogle, setShowGoogle] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProviderStatus() {
      try {
        const response = await fetch("/api/auth/providers", { cache: "no-store" });
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

  if (!showGoogle) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4">
      <GoogleSignInButton redirectTo={redirectTo} />
      <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
        <span className="h-px flex-1 bg-gray-200" />
        <span>{t("auth.orContinueWithEmail")}</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
    </div>
  );
}
