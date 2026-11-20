// In-memory stand-ins for the slice of firebase-admin the api/ handlers use:
// Firestore collection/doc reads and writes, and Auth's paged listUsers.
export function fakeFirestore(seed = {}) {
  const collections = new Map(
    Object.entries(seed).map(([name, docs]) => [name, new Map(Object.entries(docs))]),
  );
  const docsOf = (name) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  };
  const snapshot = (docs) => ({
    docs: [...docs].map(([id, data]) => ({ id, data: () => ({ ...data }) })),
  });

  return {
    runTransaction: (fn) => fn({ get: (ref) => ref.get(), set: (ref, data) => ref.set(data) }),
    collection(name) {
      const docs = docsOf(name);
      return {
        get: async () => snapshot(docs),
        where: (field, op, value) => ({
          get: async () => snapshot([...docs].filter(([, data]) => data[field] === value)),
        }),
        doc: (id) => ({
          get: async () => ({ exists: docs.has(id), data: () => ({ ...docs.get(id) }) }),
          set: async (data, { merge } = {}) => void docs.set(id, merge ? { ...docs.get(id), ...data } : { ...data }),
          delete: async () => void docs.delete(id),
        }),
      };
    },
  };
}

export function fakeAuth(accounts = []) {
  return {
    listUsers: async () => ({
      users: accounts.map((a, i) => ({ uid: `uid-${i}`, disabled: false, ...a })),
      pageToken: undefined,
    }),
  };
}
