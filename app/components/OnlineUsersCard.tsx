// app/components/OnlineUsersCard.tsx
"use client";

import { PersonIcon } from "@radix-ui/react-icons";
import { Card, Heading, Text } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

type PresencePayload = {
  onlineUsers: number;
};

export default function OnlineUsersCard() {
  const { t } = useI18n();
  const [onlineUsers, setOnlineUsers] = useState<number | null>(null);

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
        }
      } catch {
        if (!cancelled) {
          setOnlineUsers(1);
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
    <Card className="border border-orange-200 bg-white/60 p-4 shadow backdrop-blur-md transition-transform hover:scale-[1.02]">
      <div className="flex items-center gap-3">
        <PersonIcon />
        <div>
          <Text size="2" color="gray">
            {t("home.onlineNow")}
          </Text>
          <Heading size="6">
            {onlineUsers ?? "--"} {t("home.users")}
          </Heading>
        </div>
      </div>
    </Card>
  );
}
