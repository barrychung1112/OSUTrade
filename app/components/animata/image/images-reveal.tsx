import { motion } from "framer-motion";
import Image from "next/image";

export default function ProductImageReveal({ src, alt }: { src: string; alt: string }) {
  return (
    <motion.div
      initial={{ clipPath: "inset(100% 0% 0% 0%)" }}
      animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="overflow-hidden rounded-lg shadow-md"
    >
      <Image
        src={src}
        alt={alt}
        width={500}
        height={500}
        className="h-auto w-full object-cover"
      />
    </motion.div>
  );
}
