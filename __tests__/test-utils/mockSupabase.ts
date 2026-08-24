/**
 * Creates a fresh mock Supabase client shaped like the real one, with every
 * method that page.tsx / validation-db.ts touches replaced by a jest.fn().
 *
 * Usage in a test file:
 *
 *   const mockClient = createMockSupabaseClient();
 *   jest.mock('@supabase/auth-helpers-nextjs', () => ({
 *     createClientComponentClient: () => mockClient,
 *   }));
 *
 * Then in each test, configure the specific method you care about:
 *
 *   mockClient.auth.signInWithPassword.mockResolvedValue({
 *     data: { user: { id: '1', identities: [{}], user_metadata: {} } },
 *     error: null,
 *   });
 */
export function createMockSupabaseClient() {
  const maybeSingle = jest.fn();
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));

  return {
    auth: {
      signInWithPassword: jest.fn(),
      resend: jest.fn(),
      verifyOtp: jest.fn(),
    },
    rpc: jest.fn(),
    from,
    // exposed so tests can reconfigure the chained .from().select().eq().maybeSingle()
    __chain: { maybeSingle, eq, select, from },
  };
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;

/** Resets every jest.fn() on the mock client between tests. */
export function resetMockSupabaseClient(client: MockSupabaseClient) {
  client.auth.signInWithPassword.mockReset();
  client.auth.resend.mockReset();
  client.auth.verifyOtp.mockReset();
  client.rpc.mockReset();
  client.__chain.maybeSingle.mockReset();
  client.__chain.eq.mockClear();
  client.__chain.select.mockClear();
  client.__chain.from.mockClear();
}

/** Helper to build a fake logged-in Supabase user object. */
export function buildUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user-123',
    identities: [{ id: 'identity-1' }], // non-empty = already verified
    user_metadata: {},
    ...overrides,
  };
}