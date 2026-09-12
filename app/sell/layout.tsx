import type { Metadata } from "next";
import { privatePageMetadata } from "../lib/privatePageMetadata";

export const metadata: Metadata = privatePageMetadata;

export default function SellLayout({ children }: { children: React.ReactNode }) {
  return children;
}
