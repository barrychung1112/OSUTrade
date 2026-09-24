import SellerProfileClient from "./SellerProfileClient";
import { normalizeSellerProfileReturnTo } from "../../lib/sellerProfileReturn";

export default async function SellerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ sellerId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { sellerId } = await params;
  const { returnTo } = await searchParams;

  return (
    <SellerProfileClient
      sellerId={sellerId}
      backHref={normalizeSellerProfileReturnTo(returnTo)}
    />
  );
}
