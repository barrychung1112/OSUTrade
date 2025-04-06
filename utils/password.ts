import bcrypt from "bcryptjs";

export function generateHashedPassword(password: string): string {
    const saltRounds = 10; // You can adjust the number of salt rounds
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    return hashedPassword;
}

export function checkPassword(password: string, hashedPassword: string): boolean {
    return bcrypt.compareSync(password, hashedPassword);
}