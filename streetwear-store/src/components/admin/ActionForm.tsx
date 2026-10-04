"use client";

import type { ActionState } from "@/lib/admin/form";
import { PendingContext, useFormAction } from "./useFormAction";

/** <form> bound to a server action that shows the returned error/success message. */
export function ActionForm({
  action,
  children,
  className,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
}) {
  const { state, onSubmit, pending } = useFormAction(action);
  return (
    <PendingContext.Provider value={pending}>
      <form onSubmit={onSubmit} className={className}>
        {children}
        {state.error && (
          <p role="alert" className="text-danger mt-3 text-sm">
            {state.error}
          </p>
        )}
        {state.ok && state.message && <p className="text-success mt-3 text-sm">{state.message}</p>}
      </form>
    </PendingContext.Provider>
  );
}
