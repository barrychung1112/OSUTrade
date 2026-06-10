// app/components/TipProgressCard.tsx
"use client";

import { HeartIcon } from "@radix-ui/react-icons";
import { Card, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";

type TipPayload = {
  raised: number | null;
  goal: number;
  currency: string;
  supportUrl: string;
  progressConfigured: boolean;
};

const fallbackTip: TipPayload = {
  raised: null,
  goal: 2000,
  currency: "USD",
  supportUrl: "https://buymeacoffee.com/osutrade",
  progressConfigured: false,
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function TipProgressCard() {
  const { t } = useI18n();
  const [tipProgress, setTipProgress] = useState<TipPayload>(fallbackTip);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTipProgress() {
      try {
        const response = await fetch("/api/home/funding", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.ok) {
          setTipProgress((await response.json()) as TipPayload);
        }
      } catch {
        // Keep the local fallback if tip settings are not configured yet.
      }
    }

    loadTipProgress();
    return () => controller.abort();
  }, []);

  const progress = useMemo(() => {
    if (!tipProgress.progressConfigured || tipProgress.raised === null) return 0;
    if (tipProgress.goal <= 0) return 0;
    return Math.min(100, Math.round((tipProgress.raised / tipProgress.goal) * 100));
  }, [tipProgress.goal, tipProgress.progressConfigured, tipProgress.raised]);
  const showProgress = tipProgress.progressConfigured && tipProgress.raised !== null;

  return (
    <Card className="app-card p-4 backdrop-blur">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Heading size="5">{t("home.fundingTitle")}</Heading>
          <Text size="2" color="gray">
            {t("home.fundingSubtitle")}
          </Text>
        </div>
        <Link
          href={tipProgress.supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#d73f09] px-3 py-1.5 text-sm font-semibold text-white"
        >
          <HeartIcon /> {t("home.supportShort")}
        </Link>
      </div>
      {showProgress ? (
        <>
          <div className="mb-2 flex items-end justify-between gap-3">
            <Text size="6" weight="bold" className="text-[#d73f09]">
              {money(tipProgress.raised, tipProgress.currency)}
            </Text>
            <Text size="2" color="gray">
              {t("home.fundingGoal", {
                goal: money(tipProgress.goal, tipProgress.currency),
              })}
            </Text>
          </div>
          <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-orange-100">
            <div
              className="h-full rounded-full bg-[#d73f09] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>{progress}%</span>
            <span>{t("home.fundingUse")}</span>
          </div>
        </>
      ) : (
        <div className="rounded-md border border-orange-100 bg-orange-50/70 px-3 py-2">
          <Text size="2" weight="medium" className="text-gray-900">
            {t("home.fundingUntrackedTitle")}
          </Text>
          <Text as="p" size="1" color="gray" className="mt-1 leading-5">
            {t("home.fundingUntrackedBody")}
          </Text>
        </div>
      )}
      <Text as="p" size="1" color="gray" className="mt-3 leading-5">
        {t("home.fundingNote")}
      </Text>
    </Card>
  );
}
