import UserRepository from "@/repositories/userRepository";

export default class UserService {
    private userRepository: UserRepository;

    constructor(userRepository: UserRepository) {
        this.userRepository = userRepository;
    }

    async createUser(user: any): Promise<any> {
        // Check if the user already exists
        const existingUser = await this.userRepository.findByEmail(user.getEmail());
        if (existingUser) {
            throw new Error("User already exists");
        }

        // Save the user to the database
        return await this.userRepository.save(user);
    }

    async getUserById(id: string): Promise<any> {
        return await this.userRepository.findById(id);
    }
}

