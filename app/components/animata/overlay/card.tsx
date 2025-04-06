"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
}

export default function ProductCard({ id, name, price, imageUrl }: ProductCardProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/product/${id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-xl bg-white shadow-md transition hover:shadow-xl"
    >
      <img
        src={imageUrl}
        alt={name}
        className="h-60 w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 group-hover:text-indigo-600">
          {name}
        </h3>
        <p className="text-sm text-gray-500">NT$ {price.toLocaleString()}</p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            alert(`add into card：${name}`);
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700"
        >
          <ShoppingCart size={18} /> buy it
        </button>
      </div>
    </div>
  );
}