import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-3 text-6xl sm:text-8xl">Not found</h1>
      <p className="text-muted mt-4">This page doesn&apos;t exist or the product is no longer available.</p>
      <Link href="/shop" className="btn-primary mt-8">
        Shop all
      </Link>
    </div>
  );
}
