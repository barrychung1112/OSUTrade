import ProductService from "../service/productService";

class ProductController {
    private productService: ProductService;

    constructor(productService: ProductService) {
        this.productService = productService;
    }

    async listAllProducts(): Promise<any[]> {
        return this.productService.listAllProducts();
    }
    
} 

export default ProductController; 