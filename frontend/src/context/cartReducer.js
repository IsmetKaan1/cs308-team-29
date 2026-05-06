export function calcTotals(items) {
  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  };
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
      items = action.items;
      return { ...state, items, ...calcTotals(items) };

    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.id === action.product.id);
      if (existing) {
        items = state.items.map((i) =>
          i.id === action.product.id ? { ...i, quantity: i.quantity + 1 } : i
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
        i.id === action.id ? { ...i, quantity: i.quantity + 1 } : i
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
