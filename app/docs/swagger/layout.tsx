import type { Metadata } from "next";
import { privatePageMetadata } from "../../lib/privatePageMetadata";

export const metadata: Metadata = privatePageMetadata;

export default function SwaggerDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
