import { permanentRedirect } from "next/navigation";

import { productPath } from "@/app/lib/publicLocale";

export default async function LegacyProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<never> {
  const { id } = await params;
  permanentRedirect(productPath("en", id));
  throw new Error("Unreachable after permanent redirect.");
}
