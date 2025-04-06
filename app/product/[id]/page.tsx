"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams } from "next/navigation";
import { CircleUser, ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { useLoader } from "@react-three/fiber";

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

function GLBModelViewer({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  return <primitive object={gltf.scene} scale={[0.01, 0.01, 0.01]} position-y={-1} />;
}

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
      className="mx-auto max-w-screen-xl px-4 py-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {/* 左側展示區（上：3D模型，下：Google Map） */}
        <div className="flex flex-col gap-6 w-full">
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
            ></iframe>
          </div>
        </div>

        {/* 右側圖片與資訊 */}
        <div className="flex flex-col gap-4 w-full">
          <motion.div
            key={selectedImage}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full overflow-hidden rounded-lg shadow-md"
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

          <div className="">
            <h1 className="text-2xl font-bold text-gray-800">
              {product.name}
            </h1>
            <p className="mt-1 text-lg text-indigo-600 font-semibold">
              NT${product.price.toLocaleString()}
            </p>

            <div className="mt-4 flex items-center gap-3">
              <CircleUser className="text-gray-500" size={24} />
              <p className="text-gray-700 font-medium">Seller: {product.seller}</p>
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