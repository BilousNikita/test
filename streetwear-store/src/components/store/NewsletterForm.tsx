"use client";

import { useState } from "react";

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = new FormData(e.currentTarget).get("email");
    setState("loading");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    if (res?.ok) {
      setState("done");
      setMsg("You're on the list. Welcome.");
    } else {
      setState("error");
      setMsg(res?.status === 429 ? "Too many attempts, try later." : "Please enter a valid email.");
    }
  }

  if (state === "done") return <p className="text-sm font-medium">{msg}</p>;

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md">
      <div className={`flex border-b ${dark ? "border-bg/40" : "border-ink"}`}>
        <label htmlFor="nl-email" className="sr-only">
          Email address
        </label>
        <input
          id="nl-email"
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder="Email address"
          className={`h-12 flex-1 bg-transparent text-[15px] outline-none ${dark ? "placeholder:text-bg/50" : "placeholder:text-muted"}`}
        />
        <button disabled={state === "loading"} className="text-xs font-semibold tracking-[0.18em] uppercase">
          {state === "loading" ? "…" : "Subscribe"}
        </button>
      </div>
      {state === "error" && <p className="text-accent mt-2 text-xs">{msg}</p>}
    </form>
  );
}
