import { type NextRequest } from 'next/server';
import ProductController from '@/controller/productController';
import ProductService from '@/services/productService';
import { ProductRepositoryMock } from '@/repositories/productRepository';

const productRepositoryMock = new ProductRepositoryMock();
const productController = new ProductController(new ProductService(productRepositoryMock));

export async function GET(request: NextRequest) {
  const products = await productController.listAllProducts();
  return new Response(JSON.stringify(products), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}