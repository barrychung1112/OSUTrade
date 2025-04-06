import Product from "@/models/product";
import ProductRepository from "../repository/productRepository";

class ProductService {
    private productRepository: ProductRepository;

    constructor(productRepository: ProductRepository) {
        this.productRepository = productRepository;
    }
    async listAllProducts(): Promise<Product[]> {
        return await this.productRepository.listAll();
    }
}
export default ProductService;