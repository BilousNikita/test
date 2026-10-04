"use client";

import { createContext, useActionState, useContext, useTransition } from "react";
import type { ActionState } from "@/lib/admin/form";

/**
 * Runs a server action from onSubmit instead of <form action>, because React 19 resets
 * uncontrolled fields after a form action – which would wipe the admin's input on validation errors.
 */
export function useFormAction(action: (prev: ActionState, fd: FormData) => Promise<ActionState>) {
  const [state, dispatch, actionPending] = useActionState(action, {});
  const [transitionPending, startTransition] = useTransition();
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
  return { state, onSubmit, pending: actionPending || transitionPending };
}

export const PendingContext = createContext<boolean | null>(null);
export const usePendingContext = () => useContext(PendingContext);
