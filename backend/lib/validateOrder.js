const REQUIRED_ADDRESS_FIELDS = ['fullName', 'address', 'city', 'postalCode', 'country'];

function validateOrderInput({ items, shippingAddress }) {
  if (!Array.isArray(items) || items.length === 0) {
    return { ok: false, status: 400, error: 'Your cart is empty.' };
  }

  if (!shippingAddress || typeof shippingAddress !== 'object') {
    return { ok: false, status: 400, error: 'Please enter a shipping address.' };
  }

  const cleanShippingAddress = {};
  for (const field of REQUIRED_ADDRESS_FIELDS) {
    const value = shippingAddress[field];
    if (typeof value !== 'string' || !value.trim()) {
      return { ok: false, status: 400, error: `${field} is required.` };
    }
    cleanShippingAddress[field] = value.trim();
  }

  const ids = items.map((item) => item.id || item.productId).filter(Boolean);
  if (ids.length !== items.length) {
    return { ok: false, status: 400, error: 'One or more cart items are missing product information.' };
  }

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      return { ok: false, status: 400, error: 'Cart item quantities must be at least 1.' };
    }
  }

  return { ok: true, cleanShippingAddress, productIds: [...new Set(ids.map(String))] };
}

module.exports = { validateOrderInput, REQUIRED_ADDRESS_FIELDS };
