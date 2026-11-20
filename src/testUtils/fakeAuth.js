// An in-memory stand-in for Firebase Admin Auth's paged listUsers, returning
// every account in a single page.
export function fakeAuth(accounts = []) {
  return {
    listUsers: async () => ({
      users: accounts.map((a, i) => ({ uid: `uid-${i}`, disabled: false, ...a })),
      pageToken: undefined,
    }),
  };
}
