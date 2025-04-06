import { type NextRequest } from 'next/server';
import ProductController from '@/controller/productController';
import ProductService from '@/service/productService';
import { ProductRepositoryMock } from '@/repository/productRepository';

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