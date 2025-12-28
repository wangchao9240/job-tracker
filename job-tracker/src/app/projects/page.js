import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SessionCheck } from "@/components/auth/SessionCheck";
import { ProjectsPanel } from "@/components/features/projects/ProjectsPanel";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-6xl py-6 px-4 sm:px-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
              Job Tracker
            </h1>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {user.email}
                </span>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Applications
                </Link>
                <Link
                  href="/settings"
                  className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                >
                  Settings
                </Link>
                <SignOutButton />
              </div>
            )}
          </div>
        </header>

        <SessionCheck />

        {/* Projects Panel */}
        {user && <ProjectsPanel />}

        {!user && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Please sign in to view your projects.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
