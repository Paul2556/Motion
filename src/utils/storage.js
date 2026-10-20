// Any storage access can throw (Safari with cookies blocked, private mode,
// quota, sandboxed frames), so every read and write goes through here and a
// failure just means "nothing stored" instead of a white screen.
function storageArea(getStorage) {
  const area = {
    get(key) {
      try {
        return getStorage().getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        getStorage().setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      try {
        getStorage().removeItem(key);
      } catch {
        // unavailable - nothing to remove
      }
    },
    // A corrupt or unparseable value reads as missing, same as no value.
    getJSON(key) {
      const raw = area.get(key);
      if (raw == null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    setJSON(key, value) {
      return area.set(key, JSON.stringify(value));
    },
  };
  return area;
}

export const local = storageArea(() => globalThis.localStorage);
export const session = storageArea(() => globalThis.sessionStorage);
