import '@testing-library/jest-dom';

// Node >= 25 expõe um `localStorage` global quebrado (sem --localstorage-file) que
// sobrescreve o do jsdom. Nesse caso, substitui por um Storage em memória.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  const store = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() { return store.size; },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => { store.delete(key); },
    setItem: (key, value) => { store.set(key, String(value)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage });
}
