// An in-memory stand-in for the slice of the Firebase Admin Firestore API the
// api/admin handlers use, so handler tests run without the emulator.
// `failNextCommit()` makes the next batch commit throw, to simulate a function
// dying between sending an email and recording it.
export function fakeFirestore() {
  const docs = new Map();
  let autoId = 0;
  let failCommit = false;

  const toComparable = (value) => (typeof value?.toMillis === "function" ? value.toMillis() : value);

  function docRef(path) {
    const id = path.split("/").pop();
    const ref = {
      id,
      path,
      async get() {
        return snapshot(ref);
      },
      async set(data, { merge = false } = {}) {
        docs.set(path, merge ? { ...docs.get(path), ...data } : { ...data });
      },
      async update(data) {
        if (!docs.has(path)) throw new Error(`No document to update: ${path}`);
        docs.set(path, { ...docs.get(path), ...data });
      },
      async delete() {
        docs.delete(path);
      },
      collection: (name) => collectionRef(`${path}/${name}`),
    };
    return ref;
  }

  function snapshot(ref) {
    const data = docs.get(ref.path);
    return { id: ref.id, ref, exists: data !== undefined, data: () => (data ? { ...data } : undefined) };
  }

  function query(path, filters = [], order = null, max = Infinity) {
    return {
      where: (field, op, value) => {
        if (op !== "==") throw new Error(`fakeFirestore only supports ==, got ${op}`);
        return query(path, [...filters, [field, value]], order, max);
      },
      orderBy: (field, direction = "asc") => query(path, filters, { field, direction }, max),
      limit: (n) => query(path, filters, order, n),
      async get() {
        let matches = [...docs.keys()]
          .filter((key) => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes("/"))
          .map((key) => snapshot(docRef(key)))
          .filter((snap) => filters.every(([field, value]) => snap.data()[field] === value));
        if (order) {
          const sign = order.direction === "desc" ? -1 : 1;
          matches.sort((a, b) => {
            const x = toComparable(a.data()[order.field]);
            const y = toComparable(b.data()[order.field]);
            return x < y ? -sign : x > y ? sign : 0;
          });
        }
        matches = matches.slice(0, max);
        return { docs: matches, empty: matches.length === 0, size: matches.length };
      },
    };
  }

  function collectionRef(path) {
    return {
      ...query(path),
      doc: (id = `auto${++autoId}`) => docRef(`${path}/${id}`),
    };
  }

  return {
    collection: collectionRef,
    batch() {
      const ops = [];
      return {
        set: (ref, data, options) => void ops.push(() => ref.set(data, options)),
        delete: (ref) => void ops.push(() => ref.delete()),
        async commit() {
          if (failCommit) {
            failCommit = false;
            throw new Error("fakeFirestore: commit failed");
          }
          for (const op of ops) await op();
        },
      };
    },
    failNextCommit() {
      failCommit = true;
    },
  };
}
