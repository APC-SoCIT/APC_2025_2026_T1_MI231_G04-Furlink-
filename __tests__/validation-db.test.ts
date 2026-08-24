// Mock the shared supabase singleton that validation-db.ts imports directly.
const mockRpc = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: any[]) => mockRpc(...args) },
}));

import { checkFieldExists } from '@/app/(public)/auth/validation-db'; // adjust path to match your project

describe('checkFieldExists', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  it('returns true when the RPC reports the field exists', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null });

    const result = await checkFieldExists('email', 'Taken@Example.com');

    expect(result).toBe(true);
    // value should be lowercased before hitting the DB
    expect(mockRpc).toHaveBeenCalledWith('check_field_exists', {
      table_name: 'auth.users',
      column_name: 'email',
      value_to_check: 'taken@example.com',
    });
  });

  it('uses the auth_module.profiles table for username checks', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null });

    await checkFieldExists('username', 'someuser');

    expect(mockRpc).toHaveBeenCalledWith('check_field_exists', {
      table_name: 'auth_module.profiles',
      column_name: 'username',
      value_to_check: 'someuser',
    });
  });

  it('returns false (fails closed) when the RPC returns an error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const result = await checkFieldExists('email', 'x@example.com');

    expect(result).toBe(false);
  });

  it('returns false when the RPC call throws', async () => {
    mockRpc.mockRejectedValue(new Error('network down'));

    const result = await checkFieldExists('email', 'x@example.com');

    expect(result).toBe(false);
  });
});