// app/components/FundingProgressCard.tsx
"use client";

import { Card, Heading } from "@radix-ui/themes";

export default function FundingProgressCard() {
  return (
    <Card className="bg-white/70 backdrop-blur-md p-4 border border-orange-300 shadow hover:scale-[1.02] transition-transform">
      <Heading size="5" mb="2">
        Funding
      </Heading>
      <div className="w-full bg-gray-300 rounded-full h-2 mb-2">
        <div className="bg-orange-500 h-2 rounded-full w-3/5"></div>
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>100$</span>
        <span>500$</span>
        <span>1000$</span>
        <span>2000$</span>
      </div>
    </Card>
  );
}
