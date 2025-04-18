import { expect, test } from 'vitest';
import productService from './productService';
import { ProductRepositoryMock } from '../repositories/productRepository';

const productRepository = new ProductRepositoryMock();
const sut = new productService(productRepository);

test('listAllProducts returns array', async () => {
    const result = await sut.listAllProducts();
    expect(result).toBeInstanceOf(Array);
});

test('Each product must have attributes', async () => {
    const result = await sut.listAllProducts();
    result.forEach((product) => {
        expect(product).toHaveProperty('name');
        expect(product).toHaveProperty('price');
    });
});
