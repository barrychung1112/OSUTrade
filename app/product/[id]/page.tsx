"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CircleUser, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, useGLTF } from "@react-three/drei";
import { fetchProduct, type Product } from "@/app/lib/products";

const fallbackImage =
  "https://bmelflizqrhydlfuovnv.supabase.co/storage/v1/object/public/products//S__5005327_0.jpg";

function GLBModelViewer({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return (
    <primitive object={gltf.scene} scale={[0.01, 0.01, 0.01]} position-y={-1} />
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>(fallbackImage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchProduct(id, controller.signal)
      .then((data) => {
        setProduct(data);
        setSelectedImage(data.imageUrl || fallbackImage);
      })
      .catch((err: any) => {
        if (err?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "Failed to load item.");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id]);

  const images = useMemo(
    () => [product?.imageUrl || fallbackImage].filter(Boolean) as string[],
    [product?.imageUrl]
  );

  if (loading) {
    return <p className="p-6 text-center text-gray-500">Loading...</p>;
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-screen-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-800">Product unavailable</h1>
        <p className="mt-2 text-gray-600">{error || "This item was not found."}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mx-auto max-w-screen-xl px-4 py-6"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
        <div className="flex w-full flex-col gap-6">
          <div className="h-[450px]">
            <Canvas camera={{ position: [0, 0, 3] }}>
              <ambientLight intensity={0.7} />
              <directionalLight position={[2, 2, 2]} />
              <Suspense fallback={null}>
                <GLBModelViewer url="/models/bicycle.glb" />
                <Environment preset="sunset" />
              </Suspense>
              <OrbitControls enableZoom />
            </Canvas>
          </div>
          <div className="h-28 w-full">
            <iframe
              title="Product Location"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed/v1/place?key=AIzaSyAjy0A2mdJ2mkGNmHr5X5yxxQwdE7sV5UQ&q=Kelly+Engineering+Center,+Oregon+State+University"
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full overflow-hidden rounded-lg shadow-md"
          >
            <Image
              src={selectedImage}
              alt={product.name}
              width={500}
              height={500}
              className="h-auto w-full object-cover"
            />
          </motion.div>

          <div className="flex gap-2">
            {images.map((img, idx) => (
              <button
                key={img}
                onClick={() => setSelectedImage(img)}
                className={`h-20 w-20 overflow-hidden rounded border-2 ${
                  selectedImage === img ? "border-indigo-600" : "border-transparent"
                }`}
              >
                <Image
                  src={img}
                  alt={`${product.name} thumbnail ${idx + 1}`}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>

          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500">
              {product.category || "general"}
            </p>
            <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
            <p className="mt-1 text-lg font-semibold text-indigo-600">
              ${Number(product.price).toLocaleString()}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <CircleUser className="text-gray-500" size={24} />
              <p className="font-medium text-gray-700">Seller: OSUTrade user</p>
            </div>

            <button
              onClick={() => alert("Added to cart")}
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-white transition hover:bg-indigo-700"
            >
              <ShoppingCart size={20} /> Add to Cart
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
