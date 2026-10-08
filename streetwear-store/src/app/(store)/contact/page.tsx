import type { Metadata } from "next";
import { ContactForm } from "@/components/store/ContactForm";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with us.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const s = await getSettings();
  return (
    <div className="container-x grid max-w-6xl gap-12 py-12 sm:py-20 lg:grid-cols-2">
      <div>
        <h1 className="display text-6xl sm:text-8xl">Contact</h1>
        <p className="text-ink/80 mt-6 max-w-md text-[15px] leading-7">
          Questions about sizing, an order or a return? Send us a message and we&apos;ll get back to you
          within 1–2 business days. Please include your order number if you have one.
        </p>
        <p className="mt-6 text-sm">
          <span className="eyebrow block">Email</span>
          <a href={`mailto:${s.contactEmail}`} className="mt-1 inline-block underline underline-offset-4">
            {s.contactEmail}
          </a>
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
