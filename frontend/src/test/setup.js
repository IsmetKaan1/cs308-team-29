import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';

function makeStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => void map.clear(),
    key: (i) => Array.from(map.keys())[i] ?? null,
    get length() { return map.size; },
  };
}

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: makeStorage(),
});

beforeEach(() => {
  globalThis.localStorage.clear();
});
