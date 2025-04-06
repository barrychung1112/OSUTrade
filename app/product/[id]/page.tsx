"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CircleUser, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";

const productData = {
  id: "1",
  name: "Mountain Bike",
  price: 5990,
  seller: "Alex Johnson",
  images: [
    "/images/Bike_0.jpg",
    "/images/Bike_0.jpg",
    "/images/Bike_0.jpg",
  ],
};

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<typeof productData | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>("");

  useEffect(() => {
    setTimeout(() => {
      setProduct(productData);
      setSelectedImage(productData.images[0]);
    }, 200);
  }, [id]);

  if (!product) {
    return <p className="p-6 text-center text-gray-500">Loading...</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-6xl p-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 左側留白 */}
        <div className="hidden md:block"></div>

        {/* 右上圖片區 */}
        <div className="col-span-2 flex flex-col items-end gap-6">
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md overflow-hidden rounded-lg shadow-md"
          >
            <Image
              src={selectedImage}
              alt="Selected product image"
              width={500}
              height={500}
              className="h-auto w-full object-cover"
            />
          </motion.div>

          <div className="flex gap-2">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(img)}
                className={`h-20 w-20 overflow-hidden rounded border-2 ${selectedImage === img ? "border-indigo-600" : "border-transparent"}`}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* 右下產品資訊區 */}
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-gray-800">
              {product.name}
            </h1>
            <p className="mt-2 text-xl text-indigo-600 font-semibold">
              NT${product.price.toLocaleString()}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <CircleUser className="text-gray-500" size={28} />
              <p className="text-gray-700 font-medium">Seller: {product.seller}</p>
            </div>

            <button
              onClick={() => alert("Added to cart")}
              className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-white transition hover:bg-indigo-700"
            >
              <ShoppingCart size={20} /> Add to Cart
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}