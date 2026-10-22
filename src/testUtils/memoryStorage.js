// A Web Storage stand-in for tests, since Vitest's node environment has no
// sessionStorage.
export function memoryStorage() {
  const items = new Map();
  return {
    get length() {
      return items.size;
    },
    key: (index) => [...items.keys()][index] ?? null,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => void items.set(key, String(value)),
    removeItem: (key) => void items.delete(key),
    clear: () => items.clear(),
  };
}

export function storageKeys(storage) {
  return Array.from({ length: storage.length }, (_, index) => storage.key(index));
}
