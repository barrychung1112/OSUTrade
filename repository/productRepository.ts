import Product from "../models/product";
import { createRandomProduct } from "../utils/random";

class ProductRepository {
    private products: Map<string, Product>;

    constructor() {
        this.products = new Map<string, Product>();

        // Sample data (it should interact with a database)
        for (let i = 0; i < 10; i++) {
            const product = createRandomProduct();
            this.products.set(product.getId(), product);
        }
    }

    async findAll(): Promise<Product[]> {
        return Array.from(this.products.values());
    }

    async create(product: Product): Promise<Product> {
        this.products.set(product.getId(), product);
        return product;
    }
    
}
export default ProductRepository;

