import SellerProfileClient from "./SellerProfileClient";

export default async function SellerProfilePage({
  params,
}: {
  params: Promise<{ sellerId: string }>;
}) {
  const { sellerId } = await params;

  return <SellerProfileClient sellerId={sellerId} />;
}
