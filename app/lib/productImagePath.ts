const safeImageName = /^[A-Za-z0-9-]+\.(?:jpe?g|png|webp)$/i;

export function isOwnedProductImagePath(path: string, userId: string) {
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) return false;

  const fileName = path.slice(prefix.length);
  return safeImageName.test(fileName);
}
