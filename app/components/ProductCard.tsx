// components/ProductCard.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, Text, Heading, Button } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";

interface ProductCardProps {
  productId: string | number;
  name: string;
  price: number;
  imageUrl: string;
}

export default function ProductCard({
  productId,
  name,
  price,
  imageUrl,
}: ProductCardProps) {
  const [adding, setAdding] = useState(false);

  async function addToCart() {
    setAdding(true);
    try {
      await fetch("/api/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: productId,
          name,
          price,
          imageUrl,
        }),
      });
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card className="bg-white/70 backdrop-blur-md border border-orange-300 shadow hover:scale-[1.02] transition-transform overflow-hidden flex flex-col">
      <Link href={`/product/${productId}`} className="relative block w-full h-52">
        <Image src={imageUrl} alt={name} fill className="object-cover" />
      </Link>
      <div className="flex flex-col justify-between p-4 flex-1">
        <Link href={`/product/${productId}`} className="mb-4 min-w-0">
          <Heading size="4" weight="bold" className="text-[#d73f09] truncate">
            {name}
          </Heading>
        </Link>
        <div className="mt-auto flex justify-between items-center">
          <Button
            size="2"
            variant="outline"
            className="border-[#d73f09] text-[#d73f09] flex items-center gap-2"
            onClick={addToCart}
            disabled={adding}
          >
            <PlusIcon /> <span>{adding ? "Adding..." : "Add to cart"}</span>
          </Button>
          <Text size="3" weight="medium" className="text-gray-700">
            ${price}
          </Text>
        </div>
      </div>
    </Card>
  );
}
