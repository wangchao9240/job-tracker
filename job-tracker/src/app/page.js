import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { SessionCheck } from "@/components/auth/SessionCheck";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Job Tracker
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Welcome to your workspace
          </p>
          {user && (
            <div className="rounded-md bg-zinc-100 p-4 dark:bg-zinc-800">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Signed in as: <strong className="text-zinc-900 dark:text-zinc-100">{user.email}</strong>
              </p>
            </div>
          )}
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Your job applications will appear here.
          </p>
          <SessionCheck />
          {user && (
            <div className="flex gap-4">
              <Link
                href="/settings"
                className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Settings
              </Link>
              <SignOutButton />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
