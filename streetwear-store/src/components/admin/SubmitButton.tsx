"use client";

import { useFormStatus } from "react-dom";
import { usePendingContext } from "./useFormAction";

export function SubmitButton({
  children,
  pendingText = "Saving…",
  className = "btn-primary",
  name,
  value,
  confirm,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  name?: string;
  value?: string;
  confirm?: string;
}) {
  const ctx = usePendingContext();
  const { pending: formPending } = useFormStatus();
  const pending = ctx ?? formPending;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
