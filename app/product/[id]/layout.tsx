import type { Metadata } from "next";

import { buildProductMetadata } from "@/app/lib/productMetadata";
import {
  toProductRecord,
  type ProductRow,
} from "@/app/lib/productRecord";
import { createClient } from "@/utils/supabase/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("product_id", id)
      .maybeSingle();

    if (error || !data) return buildProductMetadata(null);
    return buildProductMetadata(toProductRecord(data as ProductRow));
  } catch {
    return buildProductMetadata(null);
  }
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
