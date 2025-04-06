import Product from "@/models/product";
import productRepository from "../repository/productRepository";

class ProductService {
    private productRepository: productRepository;

    constructor(productRepository: productRepository) {
        this.productRepository = productRepository;
    }
    async listAllProducts(): Promise<Product[]> {
        return await this.productRepository.findAll();
    }
}
export default ProductService;