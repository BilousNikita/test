"use client";

import { loginAction } from "@/lib/admin/auth-actions";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { PendingContext, useFormAction } from "@/components/admin/useFormAction";

export function LoginForm() {
  const { state, onSubmit, pending } = useFormAction(loginAction);
  return (
    <PendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input id="email" name="email" type="email" autoComplete="username" required className="input" />
        </div>
        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input"
          />
        </div>
        {state.error && (
          <p role="alert" className="text-danger text-sm">
            {state.error}
          </p>
        )}
        <SubmitButton className="btn-primary w-full" pendingText="Signing in…">
          Sign in
        </SubmitButton>
      </form>
    </PendingContext.Provider>
  );
}
