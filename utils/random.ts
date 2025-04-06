import Product from "../models/product";
import User from "../models/user";
import { generateHashedPassword } from "./password";

export function randomString(n: number): string {
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < n; i++) {
        result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return result;
}

export function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function createRandomProduct(): Product {
    const user = createRandomUser();

    return new Product({
        name: randomString(10),
        price: Math.floor(Math.random() * 100),
        userId: user.getId(),
    });
}

export function createRandomUser(): User {
    return new User({
        id: crypto.randomUUID(),
        name: randomString(10),
        email: randomString(5) + "@oregonstate.edu",
        password: generateHashedPassword(randomString(10)),
    });
}