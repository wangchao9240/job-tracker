"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState("");

  const sendMagicLink = async ({ nextStatus }) => {
    const supabase = createClient();

    const redirectTo = `${window.location.origin}/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      return { ok: false };
    }

    setStatus(nextStatus);
    return { ok: true };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    setResendError("");

    const result = await sendMagicLink({ nextStatus: "success" });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(
        "Couldn't send the magic link. Please double-check your email and try again."
      );
    }
  };

  const handleResend = () => {
    setStatus("idle");
    setErrorMessage("");
    setResendError("");
  };

  const handleResendNow = async () => {
    setIsResending(true);
    setResendError("");

    const result = await sendMagicLink({ nextStatus: "success" });

    if (!result.ok) {
      setResendError("Couldn't resend the magic link. Please try again.");
    }

    setIsResending(false);
  };

  // Check for error in URL params (from callback redirect)
  const urlParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const urlError = urlParams?.get("error");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Sign in to Job Tracker
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Enter your email to receive a magic link
          </p>
        </div>

        {/* URL error message (from expired/invalid magic link) */}
        {urlError && status === "idle" && (
          <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-700 dark:text-red-400">
              {urlError === "invalid_link"
                ? "The magic link is invalid or has expired. Please request a new one."
                : "An error occurred. Please try again."}
            </p>
          </div>
        )}

        {status === "success" ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                Check your email!
              </p>
              <p className="mt-1 text-sm text-green-600 dark:text-green-500">
                We sent a magic link to <strong>{email}</strong>
              </p>
            </div>
            {resendError && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {resendError}
                </p>
              </div>
            )}
            <Button
              variant="outline"
              onClick={handleResendNow}
              className="w-full"
              disabled={isResending}
            >
              {isResending ? "Sending..." : "Send another link"}
            </Button>
            <Button onClick={handleResend} className="w-full">
              Use a different email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {status === "error" && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                <p className="text-sm text-red-700 dark:text-red-400">
                  {errorMessage}
                </p>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="you@example.com"
                disabled={status === "loading"}
              />
            </div>

            <Button
              type="submit"
              disabled={status === "loading"}
              className="w-full"
            >
              {status === "loading" ? "Sending..." : "Send Magic Link"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
