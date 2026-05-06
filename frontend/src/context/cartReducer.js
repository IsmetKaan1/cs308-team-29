export function calcTotals(items) {
  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
}

function availableStock(item) {
  const value = item?.quantityInStock ?? item?.stock;
  return Number.isFinite(value) ? value : null;
}

function isOutOfStock(item) {
  const stock = availableStock(item);
  return stock != null && stock <= 0;
}

function capQuantity(item, quantity) {
  const stock = availableStock(item);
  if (stock == null) return quantity;
  return Math.min(quantity, Math.max(0, stock));
}

function sanitizeItems(items = []) {
  return items
    .map((item) => ({
      ...item,
      quantity: capQuantity(item, Math.max(1, Number(item.quantity) || 1)),
    }))
    .filter((item) => item.quantity > 0 && !isOutOfStock(item));
}

export const initialCartState = {
  items: [],
  totalItems: 0,
  totalPrice: 0,
  isOpen: false,
};

export function cartReducer(state, action) {
  let items;

  switch (action.type) {
    case 'SET_CART':
      items = sanitizeItems(action.items);
      return { ...state, items, ...calcTotals(items) };

    case 'ADD_ITEM': {
      if (isOutOfStock(action.product)) return state;
      const existing = state.items.find((i) => i.id === action.product.id);
      if (existing) {
        items = state.items.map((i) =>
          i.id === action.product.id
            ? { ...i, quantity: capQuantity(i, i.quantity + 1) }
            : i
        );
      } else {
        items = [...state.items, { ...action.product, quantity: 1 }];
      }
      return { ...state, items, ...calcTotals(items) };
    }

    case 'REMOVE_ITEM':
      items = state.items.filter((i) => i.id !== action.id);
      return { ...state, items, ...calcTotals(items) };

    case 'INCREMENT':
      items = state.items.map((i) =>
        i.id === action.id ? { ...i, quantity: capQuantity(i, i.quantity + 1) } : i
      );
      return { ...state, items, ...calcTotals(items) };

    case 'DECREMENT':
      items = state.items
        .map((i) => (i.id === action.id ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0);
      return { ...state, items, ...calcTotals(items) };

    case 'CLEAR_CART':
      return { ...state, items: [], totalItems: 0, totalPrice: 0 };

    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };

    case 'CLOSE_CART':
      return { ...state, isOpen: false };

    default:
      return state;
  }
}
