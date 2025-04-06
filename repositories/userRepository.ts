import User from "@/models/user";

export default interface UserRepository {
    listAll(): Promise<User[]>;
    save(user: User): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
}

export class UserRepositoryImpl implements UserRepository {
    private users: User[] = [];

    async listAll(): Promise<User[]> {
        return this.users;
    }

    async save(user: User): Promise<User> {
        this.users.push(user);
        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        const user = this.users.find((user) => user.getEmail() === email);
        return user ? user : null;
    }

    async findById(id: string): Promise<User | null> {
        const user = this.users.find((user) => user.getId() === id);
        return user ? user : null;
    }
}