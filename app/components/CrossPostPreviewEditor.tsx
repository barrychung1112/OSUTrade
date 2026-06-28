"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Text } from "@radix-ui/themes";
import { ArrowLeft, Check, Copy, Link2, Megaphone } from "lucide-react";
import { useI18n } from "../i18n";
import {
  crossPostPlatforms,
  type CrossPostCopy,
  type CrossPostPlatform,
} from "../lib/crossPostCopy";
import {
  buildManagedLinkSection,
  composeCrossPostClipboardText,
  type PublishedCrossPostProduct,
} from "../lib/crossPostFinalizer";

const platformLabels: Record<CrossPostPlatform, string> = {
  facebook: "Facebook",
  craigslist: "Craigslist",
  line: "LINE",
  wechat: "WeChat",
  discord: "Discord",
};

type CrossPostPreviewEditorProps = {
  copies: CrossPostCopy[];
  source: "ai" | "fallback";
  publishedProducts: PublishedCrossPostProduct[];
  busy: boolean;
  error: string | null;
  confirmLabel: string;
  canGoBack: boolean;
  canConfirm: boolean;
  onCopiesChange: (copies: CrossPostCopy[]) => void;
  onBack: () => void;
  onConfirm: () => void;
};

export default function CrossPostPreviewEditor({
  copies,
  source,
  publishedProducts,
  busy,
  error,
  confirmLabel,
  canGoBack,
  canConfirm,
  onCopiesChange,
  onBack,
  onConfirm,
}: CrossPostPreviewEditorProps) {
  const { t } = useI18n();
  const [selectedPlatform, setSelectedPlatform] =
    useState<CrossPostPlatform>("facebook");
  const [copiedPlatform, setCopiedPlatform] =
    useState<CrossPostPlatform | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const selectedCopy = useMemo(
    () =>
      copies.find((copy) => copy.platform === selectedPlatform) ??
      copies[0] ??
      null,
    [copies, selectedPlatform]
  );

  useEffect(() => {
    if (selectedCopy && selectedCopy.platform !== selectedPlatform) {
      setSelectedPlatform(selectedCopy.platform);
    }
  }, [selectedCopy, selectedPlatform]);

  const linkSection = selectedCopy
    ? buildManagedLinkSection(selectedCopy.platform, publishedProducts)
    : "";

  function updateSelectedCopy(field: "title" | "body", value: string) {
    if (!selectedCopy) return;
    setCopiedPlatform(null);
    setCopyError(null);
    onCopiesChange(
      copies.map((copy) =>
        copy.platform === selectedCopy.platform
          ? { ...copy, [field]: value }
          : copy
      )
    );
  }

  async function copyPost() {
    if (!selectedCopy) return;
    try {
      await window.navigator.clipboard.writeText(
        composeCrossPostClipboardText(selectedCopy, publishedProducts)
      );
      setCopiedPlatform(selectedCopy.platform);
      setCopyError(null);
    } catch {
      setCopyError(t("sell.crossPostPreviewCopyError"));
    }
  }

  if (!selectedCopy) return null;

  return (
    <section className="rounded-md border border-orange-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-orange-100 bg-orange-50/60 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-orange-200 bg-white text-[#d73f09]">
            <Megaphone className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <Text as="p" weight="bold" className="text-gray-950">
              {publishedProducts.length > 0
                ? t("sell.crossPostPreviewFinalTitle")
                : t("sell.crossPostPreviewTitle")}
            </Text>
            <span className="mt-1 inline-flex rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#8f2805]">
              {source === "ai"
                ? t("sell.crossPostPreviewAi")
                : t("sell.crossPostPreviewFallback")}
            </span>
          </div>
        </div>

        {!publishedProducts.length && (
          <p className="max-w-xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
            {t("sell.crossPostPreviewNotice")}
          </p>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div
          className="flex max-w-full gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label={t("sell.crossPostPreviewTitle")}
        >
          {crossPostPlatforms.map((platform) => {
            const selected = selectedPlatform === platform;
            return (
              <button
                key={platform}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setSelectedPlatform(platform);
                  setCopyError(null);
                }}
                className={`min-h-10 shrink-0 rounded-md border px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2 ${
                  selected
                    ? "border-[#d73f09] bg-[#d73f09] text-white"
                    : "border-slate-200 bg-white text-gray-700 hover:border-orange-300 hover:bg-orange-50"
                }`}
              >
                {platformLabels[platform]}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4">
          <label className="block">
            <Text as="span" size="2" weight="medium">
              {t("sell.crossPostPreviewTitleField")}
            </Text>
            <input
              className="app-input mt-2"
              aria-label={t("sell.crossPostPreviewTitleField")}
              value={selectedCopy.title}
              disabled={busy}
              onChange={(event) =>
                updateSelectedCopy("title", event.target.value)
              }
            />
          </label>

          <label className="block">
            <Text as="span" size="2" weight="medium">
              {t("sell.crossPostPreviewBodyField")}
            </Text>
            <textarea
              className="app-input mt-2 min-h-56 resize-y leading-6"
              aria-label={t("sell.crossPostPreviewBodyField")}
              value={selectedCopy.body}
              disabled={busy}
              onChange={(event) =>
                updateSelectedCopy("body", event.target.value)
              }
            />
          </label>
        </div>

        {linkSection && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-900">
              <Link2 className="h-4 w-4" />
              {t("sell.crossPostPreviewLinks")}
            </div>
            <pre className="overflow-x-auto whitespace-pre-wrap text-sm leading-6 text-emerald-950">
              {linkSection}
            </pre>
          </div>
        )}

        {(error || copyError) && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error || copyError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {canGoBack && (
              <Button
                type="button"
                variant="soft"
                color="gray"
                disabled={busy}
                onClick={onBack}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("sell.crossPostPreviewBack")}
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={copyPost}
            >
              <Copy className="h-4 w-4" />
              {copiedPlatform === selectedCopy.platform
                ? t("sell.crossPostPreviewCopied")
                : t("sell.crossPostPreviewCopy")}
            </Button>
            {canConfirm && (
              <Button
                type="button"
                highContrast
                disabled={busy}
                onClick={onConfirm}
              >
                <Check className="h-4 w-4" />
                {confirmLabel}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
