import { type NextRequest } from 'next/server';
import ProductController from '@/../controller/productController';
import ProductService from '../../../service/productService';
import ProductRepository from '../../../repository/productRepository';
 
const productController = new ProductController(new ProductService(new ProductRepository()));

export async function GET(request: NextRequest) {
  const products = await productController.listAllProducts();
  return new Response(JSON.stringify(products), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}