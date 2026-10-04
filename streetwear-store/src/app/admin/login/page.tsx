import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="border-line bg-surface w-full max-w-sm border p-8">
        <p className="eyebrow">Admin</p>
        <h1 className="display mt-2 text-4xl">Sign in</h1>
        <LoginForm />
      </div>
    </main>
  );
}
