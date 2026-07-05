import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { site } from "@/lib/content";
import { signOut } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Login page lives outside this route group so it isn't wrapped by this
  // layout. Middleware already redirects unauthenticated requests here, but
  // this is the defense-in-depth check for any Server Component under /admin.
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-surface-container-low">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <header className="border-b border-outline-variant bg-surface-container-lowest">
        <div className="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-4 px-margin-mobile py-4 md:px-margin-desktop">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="font-[family-name:var(--font-headline)] text-lg text-primary">
              {site.name} Admin
            </span>
            <AdminNav />
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-on-surface-variant sm:inline">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-sm border border-outline-variant px-3 py-1.5 text-on-surface-variant transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main id="admin-main-content" className="mx-auto max-w-container-max px-margin-mobile py-8 md:px-margin-desktop">
        {children}
      </main>
    </div>
  );
}
