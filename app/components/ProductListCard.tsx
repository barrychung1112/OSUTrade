// app/components/ProductListCard.tsx
"use client";

import { Card, Heading } from "@radix-ui/themes";

export default function ProductListCard() {
  return (
    <Card className="bg-white/70 backdrop-blur-md p-4 border border-orange-300 shadow hover:scale-[1.02] transition-transform">
      <Heading size="5" mb="3">
        On Sell Products
      </Heading>
      <ul className="text-sm text-gray-700 space-y-2">
        <li>
          <strong>Bike</strong> – Tame Impala{" "}
          <span className="float-right">50$</span>
        </li>
        <li>
          <strong>Scooter</strong> – John Smith{" "}
          <span className="float-right">99$</span>
        </li>
        <li>
          <strong>ALS145 Textbook</strong> – Arlo Parks{" "}
          <span className="float-right">13$</span>
        </li>
        <li>
          <strong>Nike T-shirt(man)</strong> – Fransisco{" "}
          <span className="float-right">11$</span>
        </li>
        <li>
          <strong>AC</strong> – Arbao <span className="float-right">100$</span>
        </li>
      </ul>
    </Card>
  );
}
