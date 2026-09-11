import { NextResponse, type NextRequest } from "next/server";
import { canUseDemoProducts, findDemoProduct } from "@/app/lib/demoProducts";
import { getPublicProduct } from "@/app/lib/publicProduct";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await getPublicProduct(id);

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error(error);
    if (!canUseDemoProducts()) {
      return NextResponse.json(
        { message: "Failed to load product." },
        { status: 500 }
      );
    }

    const { id } = await params;
    const product = findDemoProduct(id);

    if (!product) {
      return NextResponse.json({ message: "Product not found." }, { status: 404 });
    }

    return NextResponse.json({ ...product, source: "demo" }, { status: 200 });
  }
}
