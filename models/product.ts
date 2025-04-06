export default class Product {
    private id: string;
    private name: string;
    private price: number;
    private description?: string;
    // imageUrl: string;
    private userId: string;
    // createdAt: Date;
    // updatedAt: Date;

    constructor({ name, price, description, userId }: { name: string; price: number; description?: string; userId: string }) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.price = price;
        this.description = description;
        this.userId = userId;
    }

    getId(): string {
        return this.id;
    }
}