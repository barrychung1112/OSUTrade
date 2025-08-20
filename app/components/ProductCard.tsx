// components/ProductCard.tsx
"use client";

import Image from "next/image";
import { Card, Text, Heading, Flex, Button } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

export default function ProductCard({
  id,
  name,
  price,
  imageUrl,
}: ProductCardProps) {
  return (
    <Card className="bg-white/70 backdrop-blur-md border border-orange-300 shadow hover:scale-[1.02] transition-transform overflow-hidden flex flex-col">
      <div className="relative w-full h-52">
        <Image src={imageUrl} alt={name} fill className="object-cover" />
      </div>
      <div className="flex flex-col justify-between p-4 flex-1">
        <Heading
          size="4"
          weight="bold"
          className="text-[#d73f09] truncate mb-4"
        >
          {name}
        </Heading>
        <div className="mt-auto flex justify-between items-center">
          <Button
            size="2"
            variant="outline"
            className="border-[#d73f09] text-[#d73f09] flex items-center gap-2"
          >
            <PlusIcon /> <span>Add to cart</span>
          </Button>
          <Text size="3" weight="medium" className="text-gray-700">
            ${price}
          </Text>
        </div>
      </div>
    </Card>
  );
}
