// app/components/FundingProgressCard.tsx
"use client";

import { HeartIcon } from "@radix-ui/react-icons";
import { Card, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../i18n";

type FundingPayload = {
  raised: number;
  goal: number;
  currency: string;
  supportUrl: string;
};

const fallbackFunding: FundingPayload = {
  raised: 0,
  goal: 2000,
  currency: "USD",
  supportUrl: "https://buymeacoffee.com/osutrade",
};

function money(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FundingProgressCard() {
  const { t } = useI18n();
  const [funding, setFunding] = useState<FundingPayload>(fallbackFunding);

  useEffect(() => {
    const controller = new AbortController();

    async function loadFunding() {
      try {
        const response = await fetch("/api/home/funding", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.ok) {
          setFunding((await response.json()) as FundingPayload);
        }
      } catch {
        // Keep the local fallback if funding settings are not configured yet.
      }
    }

    loadFunding();
    return () => controller.abort();
  }, []);

  const progress = useMemo(() => {
    if (funding.goal <= 0) return 0;
    return Math.min(100, Math.round((funding.raised / funding.goal) * 100));
  }, [funding.goal, funding.raised]);

  return (
    <Card className="border border-orange-300 bg-white/70 p-4 shadow backdrop-blur-md transition-transform hover:scale-[1.02]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Heading size="5">{t("home.fundingTitle")}</Heading>
          <Text size="2" color="gray">
            {t("home.fundingSubtitle")}
          </Text>
        </div>
        <Link
          href={funding.supportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#d73f09] px-3 py-1.5 text-sm font-semibold text-white"
        >
          <HeartIcon /> {t("home.supportShort")}
        </Link>
      </div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <Text size="6" weight="bold" className="text-[#d73f09]">
          {money(funding.raised, funding.currency)}
        </Text>
        <Text size="2" color="gray">
          {t("home.fundingGoal", {
            goal: money(funding.goal, funding.currency),
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
    </Card>
  );
}
