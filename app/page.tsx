"use client";
import BlurryBlob from "./components/animata/background/blurry-blob";
import Header from "./components/animata/overlay/header";
import ProductCard from "./components/animata/overlay/card"
import { useEffect, useState } from "react";

export default function Page() {
  const [products, setProduct] = useState<any>([]);
  useEffect(() => {
    fetch(`/api/products`)
      .then(res => res.json())
      .then(data => setProduct(data))
      .catch(err => console.error("Fetch failed:", err));
  },[]);
  
  console.log(products);

  return <main className="h-screen flex items-center justify-center bg-gray-100">
    <BlurryBlob
      className="rounded-xl opacity-55 absolute w-full h-full"
      firstBlobColor="bg-purple-400"
      secondBlobColor="bg-blue-400"
    />
    <Header />
    
    <div className="grid grid-cols-1 gap-10 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 absolute ml-auto mr-auto top-40">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          id={product.id}
          name={product.name}
          price={product.price}
          imageUrl="/images/DellMonitor_0.jpg"
        />
      ))}
    </div>
  </main>

}