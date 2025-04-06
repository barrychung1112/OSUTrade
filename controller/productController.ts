import Product from "@/models/product";
import ProductService from "../services/productService";

class ProductController {
    private productService: ProductService;

    constructor(productService: ProductService) {
        this.productService = productService;
    }

    async listAllProducts(): Promise<Product[]> {
        return this.productService.listAllProducts();
    }
    
} 

export default ProductController; 