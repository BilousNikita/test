"use client";

import { useState } from "react";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState("sending");
    setErrors({});
    setError("");
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd)),
    }).catch(() => null);
    const data = await res?.json().catch(() => ({}));
    if (res?.ok) return setState("sent");
    setErrors(data?.fieldErrors ?? {});
    setError(data?.error ?? "Could not send your message.");
    setState("idle");
  }

  if (state === "sent")
    return <p className="display self-center text-4xl">Thanks — we&apos;ll be in touch.</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor="c-name" className="label">
          Name
        </label>
        <input id="c-name" name="name" className="input" required maxLength={120} autoComplete="name" />
        {errors.name && <p className="text-danger mt-1 text-xs">{errors.name}</p>}
      </div>
      <div>
        <label htmlFor="c-email" className="label">
          Email
        </label>
        <input
          id="c-email"
          name="email"
          type="email"
          className="input"
          required
          maxLength={200}
          autoComplete="email"
        />
        {errors.email && <p className="text-danger mt-1 text-xs">{errors.email}</p>}
      </div>
      <div>
        <label htmlFor="c-msg" className="label">
          Message
        </label>
        <textarea
          id="c-msg"
          name="message"
          rows={6}
          className="input h-auto py-3"
          required
          maxLength={5000}
        />
        {errors.message && <p className="text-danger mt-1 text-xs">{errors.message}</p>}
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      <button className="btn-primary" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
