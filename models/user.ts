export default class User {
    private id: string;
    private name: string;
    private email: string;
    private password: string;

    constructor({ id, name, email, password }: { id: string; name: string; email: string; password: string }) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.password = password;
    }

    getId(): string {
        return this.id;
    }

    getEmail() {
        return this.email;
    }

    getName() {
        return this.name;
    }

    getPassword() {
        return this.password;
    }
}