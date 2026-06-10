// app/components/OnlineUsersCard.tsx
"use client";

import { PersonIcon } from "@radix-ui/react-icons";
import { Card, Heading, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

type PresencePayload = {
  onlineUsers: number;
  totalUsers: number | null;
};

export default function OnlineUsersCard() {
  const { t } = useI18n();
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function heartbeat() {
      try {
        const response = await fetch("/api/home/presence", {
          method: "POST",
          cache: "no-store",
        });

        if (!response.ok) return;

        const payload = (await response.json()) as PresencePayload;
        if (!cancelled) {
          setOnlineUsers(payload.onlineUsers);
          setTotalUsers(payload.totalUsers);
        }
      } catch {
        if (!cancelled) {
          setOnlineUsers(1);
          setTotalUsers(null);
        }
      }
    }

    heartbeat();
    const timer = window.setInterval(heartbeat, 60_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <Card className="app-card p-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[#d73f09]">
          <PersonIcon />
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-4">
          <div>
            <Text size="2" color="gray">
              {t("home.onlineNow")}
            </Text>
            <Heading size="5">
              {onlineUsers ?? "--"} {t("home.users")}
            </Heading>
          </div>
          <div className="border-l border-orange-100 pl-4">
            <Text size="2" color="gray">
              {t("home.totalUsers")}
            </Text>
            <Heading size="5">
              {totalUsers ?? "--"} {t("home.users")}
            </Heading>
          </div>
        </div>
      </div>
    </Card>
  );
}
