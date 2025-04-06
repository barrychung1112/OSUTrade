import { expect, test } from 'vitest';
import User from "../models/user";
import UserService from "./userService"; // Import the UserService
import { fail } from 'assert';
import UserRepository, { UserRepositoryImpl } from "../repositories/userRepository"; // Import the UserRepository
import { createRandomUser } from '@/utils/random';

test('Create User', async () => {
    const randomUser = createRandomUser();
    const userRepository = new UserRepositoryImpl(); // Create an instance of UserRepository
    const userService = new UserService(userRepository); // Create an instance of UserService
    let createdUser: User | null = null;

    try {
        createdUser = await userService.createUser(randomUser);
        expect(createdUser).toBeDefined();
    } catch (error) {
        fail("Should not have thrown an error");
    }

    expect(createdUser).not.toBeNull(); // Expect user not to be null
    expect(createdUser).toBeInstanceOf(User); // Expect createdUser to be an instance of User

    // Check if attributes are equal
    expect(createdUser?.getName()).toEqual(randomUser.getName());
    expect(createdUser?.getPassword()).toEqual(randomUser.getPassword());
    expect(createdUser?.getId()).toEqual(randomUser.getId());
});