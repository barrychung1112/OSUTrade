export default class User {
    private id: string;
    private name: string;
    private email: string;
    private password: string;

    constructor({ name, email, password }: { name: string; email: string; password: string }) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.email = email;
        this.password = password;
    }

    getId(): string {
        return this.id;
    }
}