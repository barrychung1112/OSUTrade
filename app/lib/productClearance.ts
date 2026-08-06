type ClearanceQuery<T> = {
  or: (filter: string) => T;
};

type ClearanceDiscoveryProduct = {
  price: number | string;
  isClearance?: boolean;
};

export function applyProductClearanceFilter<T extends ClearanceQuery<T>>(
  query: T
) {
  return query.or("clearance_price.not.is.null,effective_price.eq.1");
}

export function isClearanceDiscoveryProduct(
  product: ClearanceDiscoveryProduct
) {
  return product.isClearance === true || Number(product.price) === 1;
}
