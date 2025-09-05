// components/TimezoneCards.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, Text } from "@radix-ui/themes";
import { ClockIcon } from "@radix-ui/react-icons";

const timezones = [
  { label: "Taipei", zone: "Asia/Taipei", flag: "🇹🇼" },
  { label: "Oregon", zone: "America/Los_Angeles", flag: "🇺🇸" },
  { label: "Beijing", zone: "Asia/Shanghai", flag: "🇨🇳" },
  { label: "Tokyo", zone: "Asia/Tokyo", flag: "🇯🇵" },
  { label: "New York", zone: "America/New_York", flag: "🇺🇸" },
  { label: "Delhi", zone: "Asia/Kolkata", flag: "🇮🇳" },
  { label: "Seoul", zone: "Asia/Seoul", flag: "🇰🇷" },
  { label: "UK", zone: "Europe/London", flag: "🇬🇧" },
];

export default function TimezoneCards() {
  const [zoneTimes, setZoneTimes] = useState<Record<string, string>>({});
  const [zoneDates, setZoneDates] = useState<Record<string, string>>({});

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const newTimes: Record<string, string> = {};
      const newDates: Record<string, string> = {};
      for (const { label, zone } of timezones) {
        newTimes[label] = new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(now);
        newDates[label] = new Intl.DateTimeFormat("en-US", {
          timeZone: zone,
          year: "numeric",
          month: "short",
          day: "2-digit",
          weekday: "short",
        }).format(now);
      }
      setZoneTimes(newTimes);
      setZoneDates(newDates);
    };

    updateTimes();
    const timer = setInterval(updateTimes, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(160px,1fr))] w-full"
      suppressHydrationWarning={true}
    >
      {timezones.map(({ label, flag }) => (
        <Card
          key={label}
          className="bg-white/60 backdrop-blur-md p-4 shadow border border-orange-200 hover:scale-[1.02] transition-transform"
        >
          <div className="flex gap-3 items-start">
            <ClockIcon className="mt-1" />
            <div className="flex flex-col">
              <Text size="2" color="gray">
                {flag} {label} Time
              </Text>
              <Text size="3" color="gray">
                {zoneDates[label] || "--"}
              </Text>
              <Text size="4" weight="medium">
                {zoneTimes[label] || "--"}
              </Text>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
