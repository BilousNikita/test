import type { Metadata } from "next";
import { StaticPageView } from "@/components/store/StaticPageView";
import { PAGES } from "@/content/pages";

const page = PAGES.returns!;

export const metadata: Metadata = {
  title: page.title,
  description: page.description.replace("{{store}}", "us"),
  alternates: { canonical: "/returns" },
};

export default function Page() {
  return <StaticPageView page={page} />;
}
