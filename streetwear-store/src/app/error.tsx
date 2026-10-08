"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <h1 className="display text-6xl">Something went wrong</h1>
      <p className="text-muted mt-4">Please try again. If the problem persists, contact us.</p>
      <button onClick={reset} className="btn-primary mt-8">
        Try again
      </button>
    </main>
  );
}
