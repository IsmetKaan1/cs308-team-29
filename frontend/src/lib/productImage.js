const PRODUCT_IMAGES = {
  cs204: 'cs204.jpeg',
  cs300: 'cs300.png',
  cs301: 'cs301.png',
  cs306: 'cs306.jpeg',
  cs308: 'cs308.jpeg',
  cs408: 'cs408.jpeg',
  cs412: 'cs412.jpeg',
};

export function productImage(code) {
  if (!code) return null;
  const key = String(code).toLowerCase().replace(/[^a-z0-9]/g, '');
  const file = PRODUCT_IMAGES[key];
  return file ? `/products/${file}` : null;
}
