// components/TimezoneCards.tsx
"use client";

import { ClockIcon } from "@radix-ui/react-icons";
import { Card, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";

const timezones = [
  { label: "Taipei", zone: "Asia/Taipei", code: "TPE" },
  { label: "Oregon", zone: "America/Los_Angeles", code: "PDX" },
  { label: "Beijing", zone: "Asia/Shanghai", code: "BJS" },
  { label: "Tokyo", zone: "Asia/Tokyo", code: "TYO" },
  { label: "New York", zone: "America/New_York", code: "NYC" },
  { label: "Delhi", zone: "Asia/Kolkata", code: "DEL" },
  { label: "Seoul", zone: "Asia/Seoul", code: "SEL" },
  { label: "UK", zone: "Europe/London", code: "LON" },
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
      className="grid w-full grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4"
      suppressHydrationWarning={true}
    >
      {timezones.map(({ label, code }) => (
        <Card
          key={label}
          className="border border-orange-200 bg-white/60 p-4 shadow backdrop-blur-md transition-transform hover:scale-[1.02]"
        >
          <div className="flex items-start gap-3">
            <ClockIcon className="mt-1" />
            <div className="flex flex-col">
              <Text size="2" color="gray">
                {code} - {label} Time
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
