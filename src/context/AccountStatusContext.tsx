"use client";

import React, { createContext, useContext } from "react";

export interface AccountStatus {
  /** True while the account is suspended (read-only mode). */
  isSuspended: boolean;
  /** When the current suspension ends, if known. */
  suspendedUntil: string | null;
}

const AccountStatusContext = createContext<AccountStatus>({
  isSuspended: false,
  suspendedUntil: null,
});

export const AccountStatusProvider = AccountStatusContext.Provider;

/** Read the signed-in user's suspension state anywhere under the logged-in layout. */
export const useAccountStatus = () => useContext(AccountStatusContext);

export const SUSPENDED_ACTION_MESSAGE =
  "Your account is suspended, so this action is unavailable until the suspension ends.";