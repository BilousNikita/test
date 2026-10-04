import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-8 text-center">
      <h1 className="display text-7xl">Not found</h1>
      <Link href="/" className="btn-primary mt-8">
        Go home
      </Link>
    </main>
  );
}
