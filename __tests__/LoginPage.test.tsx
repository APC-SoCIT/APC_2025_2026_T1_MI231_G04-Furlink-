import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMockSupabaseClient,
  resetMockSupabaseClient,
  buildUser,
} from './test-utils/mockSupabase';

// ---- Mocks that must be declared before importing the component ----

const mockPush = jest.fn();
const mockRefresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

const mockClient = createMockSupabaseClient();

jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockClient,
}));

// Adjust this import path to wherever page.tsx actually lives in your repo,
// e.g. '@/app/(public)/auth/login/page'
import LoginPage from '@/app/(public)/auth/login/page';

// ---- Shared helpers ----

function fillAndSubmit(identifier: string, password: string) {
  const user = userEvent.setup();
  return (async () => {
    if (identifier) {
      await user.type(
        screen.getByPlaceholderText(/email address or username/i),
        identifier
      );
    }
    if (password) {
      await user.type(screen.getByPlaceholderText(/^password$/i), password);
    }
    await user.click(screen.getByRole('button', { name: /log in/i }));
  })();
}

beforeEach(() => {
  jest.clearAllMocks();
  resetMockSupabaseClient(mockClient);
  window.localStorage.clear();
});

describe('LoginPage - form validation (client-side, no network)', () => {
  // USR-LOG_TC03
  it('blocks submit and shows an error when identifier is empty', async () => {
    render(<LoginPage />);
    await fillAndSubmit('', 'somepassword');

    expect(
      await screen.findByText(/email or username is required/i)
    ).toBeInTheDocument();
    expect(mockClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  // USR-LOG_TC04
  it('blocks submit for a too-short, non-email identifier', async () => {
    render(<LoginPage />);
    await fillAndSubmit('ab', 'somepassword');

    expect(
      await screen.findByText(/please enter a valid email address or username/i)
    ).toBeInTheDocument();
    expect(mockClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  // USR-LOG_TC05
  it('blocks submit when password is empty', async () => {
    render(<LoginPage />);
    await fillAndSubmit('valid.user@gmail.com', '');

    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(mockClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  // USR-LOG_TC06
  it('blocks submit when password is under 6 characters', async () => {
    render(<LoginPage />);
    await fillAndSubmit('valid.user@gmail.com', 'abcde');

    expect(
      await screen.findByText(/password must be at least 6 characters/i)
    ).toBeInTheDocument();
    expect(mockClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe('LoginPage - successful logins', () => {
  // USR-LOG_TC01
  it('logs in with an email identifier and routes a pet_owner to their dashboard', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: buildUser() },
      error: null,
    });
    mockClient.__chain.maybeSingle.mockResolvedValue({
      data: { role: 'pet_owner' },
    });

    render(<LoginPage />);
    await fillAndSubmit('juan.delacruz@gmail.com', 'Passw0rd!');

    await waitFor(() =>
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'juan.delacruz@gmail.com',
        password: 'Passw0rd!',
      })
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/pet_owner'));
    expect(mockClient.rpc).not.toHaveBeenCalled(); // no username lookup needed
  });

  // USR-LOG_TC02
  it('resolves a username to an email via RPC before signing in', async () => {
    mockClient.rpc.mockResolvedValue({
      data: 'juan.delacruz@gmail.com',
      error: null,
    });
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: buildUser() },
      error: null,
    });
    mockClient.__chain.maybeSingle.mockResolvedValue({
      data: { role: 'pet_owner' },
    });

    render(<LoginPage />);
    await fillAndSubmit('juandc21', 'Passw0rd!');

    await waitFor(() =>
      expect(mockClient.rpc).toHaveBeenCalledWith('get_email_for_username', {
        lookup_username: 'juandc21',
      })
    );
    await waitFor(() =>
      expect(mockClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'juan.delacruz@gmail.com',
        password: 'Passw0rd!',
      })
    );
  });

  // USR-LOG_TC17
  it('routes a service_provider to the onboarding page', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: buildUser() },
      error: null,
    });
    mockClient.__chain.maybeSingle.mockResolvedValue({
      data: { role: 'service_provider' },
    });

    render(<LoginPage />);
    await fillAndSubmit('provider@furlink.com', 'ProviderP@ss1');

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        '/service_provider/manage_listing/onboarding'
      )
    );
  });

  // USR-LOG_TC18
  it('sends an admin straight to the dashboard when must_change_password is false', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: buildUser({ user_metadata: { must_change_password: false } }),
      },
      error: null,
    });
    mockClient.__chain.maybeSingle.mockResolvedValue({ data: { role: 'admin' } });

    render(<LoginPage />);
    await fillAndSubmit('admin.maria@furlink.com', 'AdminP@ss1');

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/admin/dashboard'));
  });

  // USR-LOG_TC19
  it('forces a first-login admin to the password-change screen', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        user: buildUser({ user_metadata: { must_change_password: true } }),
      },
      error: null,
    });
    mockClient.__chain.maybeSingle.mockResolvedValue({ data: { role: 'admin' } });

    render(<LoginPage />);
    await fillAndSubmit('admin.maria@furlink.com', 'AdminP@ss1');

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/auth/admin_first_login')
    );
  });
});

describe('LoginPage - failed logins', () => {
  // USR-LOG_TC07
  it('shows a generic error and never calls signInWithPassword when the username RPC finds nothing', async () => {
    mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'not found' } });

    render(<LoginPage />);
    await fillAndSubmit('unknownuser', 'SomePass1!');

    expect(
      await screen.findByText(/invalid email\/username or password/i)
    ).toBeInTheDocument();
    expect(mockClient.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  // USR-LOG_TC08
  it('shows the same generic error for a wrong password on a valid identifier', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });

    render(<LoginPage />);
    await fillAndSubmit('juan.delacruz@gmail.com', 'WrongPass1!');

    expect(
      await screen.findByText(/invalid email\/username or password/i)
    ).toBeInTheDocument();
  });

  // USR-LOG_TC16
  it('shows a generic error when Supabase returns no error but also no user', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    render(<LoginPage />);
    await fillAndSubmit('juan.delacruz@gmail.com', 'Passw0rd!');

    expect(
      await screen.findByText(/invalid email\/username or password/i)
    ).toBeInTheDocument();
  });
});

describe('LoginPage - unconfirmed-email OTP flow', () => {
  // USR-LOG_TC09
  it('switches to the OTP verification screen when the email is not confirmed', async () => {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email not confirmed' },
    });
    mockClient.auth.resend.mockResolvedValue({ error: null });

    render(<LoginPage />);
    await fillAndSubmit('new.user@gmail.com', 'Passw0rd!');

    await waitFor(() =>
      expect(mockClient.auth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'new.user@gmail.com',
      })
    );
    expect(
      await screen.findByRole('heading', { name: /verify your account/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/new\.user@gmail\.com/)).toBeInTheDocument();
  });

  // USR-LOG_TC10
  it('blocks the OTP trigger after 5 prior attempts within 10 minutes', async () => {
    const key = 'login_attempts_new.user@gmail.com';
    const now = Date.now();
    window.localStorage.setItem(
      key,
      JSON.stringify({ attempts: [now, now, now, now, now] })
    );

    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email not confirmed' },
    });
    // Mocked so that IF the rate limit fails to block (see note below),
    // the test fails on the real assertion instead of crashing on an
    // unmocked resend() call.
    mockClient.auth.resend.mockResolvedValue({ error: null });

    render(<LoginPage />);
    await fillAndSubmit('new.user@gmail.com', 'Passw0rd!');

    // NOTE: as of the current page.tsx, triggerVerificationFlow() calls
    // localStorage.removeItem(...) BEFORE checkLoginRateLimit(), which wipes
    // any pre-existing attempt count on every submit. That means this
    // assertion will currently fail against real app behavior — this is a
    // genuine bug to flag/fix in page.tsx, not a bug in this test.
    expect(
      await screen.findByText(/reached the maximum requests/i)
    ).toBeInTheDocument();
    expect(mockClient.auth.resend).not.toHaveBeenCalled();
    // still on the login form, not the OTP screen
    expect(
      screen.queryByRole('heading', { name: /verify your account/i })
    ).not.toBeInTheDocument();
  });

  // Helper to drive the component into the OTP screen for TC11-15
  async function getToOtpScreen() {
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email not confirmed' },
    });
    mockClient.auth.resend.mockResolvedValue({ error: null });

    render(<LoginPage />);
    await fillAndSubmit('new.user@gmail.com', 'Passw0rd!');
    await screen.findByRole('heading', { name: /verify your account/i });
    return userEvent.setup();
  }

  // USR-LOG_TC11
  it('verifies the OTP and routes by role on success', async () => {
    const user = await getToOtpScreen();
    mockClient.auth.verifyOtp.mockResolvedValue({
      data: { session: {}, user: buildUser() },
      error: null,
    });
    mockClient.__chain.maybeSingle.mockResolvedValue({
      data: { role: 'pet_owner' },
    });

    await user.type(screen.getByPlaceholderText(/enter 6-digit otp/i), '123456');
    await user.click(screen.getByRole('button', { name: /verify account/i }));

    await waitFor(() =>
      expect(mockClient.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'new.user@gmail.com',
        token: '123456',
        type: 'signup',
      })
    );
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/pet_owner'));
  });

  // USR-LOG_TC12
  it('shows an inline error for an incorrect OTP', async () => {
    const user = await getToOtpScreen();
    mockClient.auth.verifyOtp.mockResolvedValue({
      data: null,
      error: { message: 'Token has expired or is invalid' },
    });

    await user.type(screen.getByPlaceholderText(/enter 6-digit otp/i), '222222');
    await user.click(screen.getByRole('button', { name: /verify account/i }));

    expect(await screen.findByText(/invalid token/i)).toBeInTheDocument();
  });

  // USR-LOG_TC15
  it('keeps the Resend button disabled while the countdown is still running', async () => {
    await getToOtpScreen();

    expect(screen.getByRole('button', { name: /resend code/i })).toBeDisabled();
    expect(mockClient.auth.resend).toHaveBeenCalledTimes(1); // only the initial send
  });

  // USR-LOG_TC13 (uses fake timers to fast-forward the 2-minute countdown)
  it('disables the OTP input and submit button once the timer hits 0', async () => {
    jest.useFakeTimers({ advanceTimers: true });
    try {
      const user = userEvent.setup({ delay: null });
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email not confirmed' },
      });
      mockClient.auth.resend.mockResolvedValue({ error: null });

      render(<LoginPage />);
      await fillAndSubmit('new.user@gmail.com', 'Passw0rd!');
      await screen.findByRole('heading', { name: /verify your account/i });

      await act(async () => {
        jest.advanceTimersByTime(120_000); // 2 minutes
      });

      await waitFor(() =>
        expect(screen.getByText(/code expired/i)).toBeInTheDocument()
      );
      expect(screen.getByPlaceholderText(/enter 6-digit otp/i)).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /verify account/i })
      ).toBeDisabled();
    } finally {
      jest.useRealTimers();
    }
  });
});