// app/components/OnlineUsersCard.tsx
"use client";

import { Card, Text, Heading } from "@radix-ui/themes";
import { PersonIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export default function OnlineUsersCard() {
  const [onlineUsers] = useState(5);

  return (
    <Card className="bg-white/60 backdrop-blur-md p-4 shadow border border-orange-200 hover:scale-[1.02] transition-transform">
      <div className="flex items-center gap-3">
        <PersonIcon />
        <div>
          <Text size="2" color="gray">
            Currently online
          </Text>
          <Heading size="6">{onlineUsers} users</Heading>
        </div>
      </div>
    </Card>
  );
}
