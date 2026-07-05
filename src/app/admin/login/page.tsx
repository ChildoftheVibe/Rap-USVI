import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/forms/AdminLoginForm";
import { site } from "@/lib/content";

export const metadata: Metadata = {
  title: `Admin sign in | ${site.name}`,
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-container-low px-margin-mobile py-16">
      <div className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container-lowest p-8 shadow-sm">
        <h1 className="mb-1 font-[family-name:var(--font-headline)] text-2xl text-primary">
          {site.name} Admin
        </h1>
        <p className="mb-6 text-sm text-on-surface-variant">Sign in to manage sign-ups and inquiries.</p>
        <AdminLoginForm />
      </div>
    </main>
  );
}
