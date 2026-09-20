"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { shouldBypassProductImageOptimization } from "@/app/lib/productImageOptimization";

type ProductImageGalleryCopy = {
  viewFullImage: string;
  imageViewer: string;
  closeImageViewer: string;
  previousImage: string;
  nextImage: string;
  viewImage: string;
  imageCounter: string;
};

type ProductImageGalleryProps = {
  images: string[];
  itemName: string;
  copy: ProductImageGalleryCopy;
};

const swipeThreshold = 48;

function replaceValue(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export default function ProductImageGallery({
  images,
  itemName,
  copy,
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const imageCount = images.length;
  const selectedImage = images[selectedIndex] ?? images[0];
  const hasMultipleImages = imageCount > 1;

  function showPrevious() {
    setSelectedIndex((current) => (current - 1 + imageCount) % imageCount);
  }

  function showNext() {
    setSelectedIndex((current) => (current + 1) % imageCount);
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      } else if (event.key === "ArrowLeft" && hasMultipleImages) {
        showPrevious();
      } else if (event.key === "ArrowRight" && hasMultipleImages) {
        showNext();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultipleImages, imageCount, isOpen]);

  if (!selectedImage) return null;

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative block w-full overflow-hidden rounded-lg bg-gray-100 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2"
          aria-label={copy.viewFullImage}
        >
          <span className="relative block aspect-[4/3]">
            <Image
              src={selectedImage}
              alt={itemName}
              fill
              sizes="(min-width: 768px) 55vw, 100vw"
              unoptimized={shouldBypassProductImageOptimization(selectedImage)}
              className="object-cover transition duration-200 group-hover:scale-[1.02]"
              priority
            />
          </span>
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-gray-950/80 px-3 py-2 text-sm font-semibold text-white shadow-sm">
            <ZoomIn size={16} aria-hidden="true" />
            {copy.viewFullImage}
          </span>
        </button>

        {hasMultipleImages ? (
          <div className="grid grid-cols-3 gap-2">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                onClick={() => setSelectedIndex(index)}
                aria-label={replaceValue(copy.viewImage, { number: index + 1 })}
                aria-current={index === selectedIndex ? "true" : undefined}
                className={`relative aspect-[4/3] overflow-hidden rounded-md bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d73f09] focus-visible:ring-offset-2 ${
                  index === selectedIndex ? "ring-2 ring-[#d73f09] ring-offset-2" : ""
                }`}
              >
                <Image
                  src={image}
                  alt={`${itemName} ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 180px, 33vw"
                  unoptimized={shouldBypassProductImageOptimization(image)}
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.imageViewer}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/95 p-4 sm:p-8"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative flex h-full w-full max-w-6xl items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const startX = touchStartX.current;
              const endX = event.changedTouches[0]?.clientX;
              touchStartX.current = null;

              if (!hasMultipleImages || startX === null || endX === undefined) return;
              if (Math.abs(endX - startX) < swipeThreshold) return;

              if (endX > startX) showPrevious();
              else showNext();
            }}
          >
            <Image
              src={selectedImage}
              alt={`${itemName} full size ${selectedIndex + 1}`}
              fill
              sizes="100vw"
              unoptimized={shouldBypassProductImageOptimization(selectedImage)}
              className="object-contain"
              priority
            />

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={copy.closeImageViewer}
              className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/95 text-gray-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
            >
              <X size={22} aria-hidden="true" />
            </button>

            {hasMultipleImages ? (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label={copy.previousImage}
                  className="absolute left-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-white/95 text-gray-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  <ChevronLeft size={24} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label={copy.nextImage}
                  className="absolute right-0 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-white/95 text-gray-900 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
                >
                  <ChevronRight size={24} aria-hidden="true" />
                </button>
                <p className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-md bg-gray-950/80 px-3 py-2 text-sm font-semibold text-white">
                  {replaceValue(copy.imageCounter, {
                    current: selectedIndex + 1,
                    total: imageCount,
                  })}
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
