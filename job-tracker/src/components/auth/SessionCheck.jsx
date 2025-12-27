"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function SessionCheck() {
  const [status, setStatus] = useState("idle"); // idle | ok | unauthorized | error

  useEffect(() => {
    let didCancel = false;

    async function run() {
      try {
        const response = await fetch("/api/me", { cache: "no-store" });

        if (didCancel) return;

        if (response.status === 401) {
          setStatus("unauthorized");
          return;
        }

        setStatus(response.ok ? "ok" : "error");
      } catch {
        if (!didCancel) setStatus("error");
      }
    }

    run();

    return () => {
      didCancel = true;
    };
  }, []);

  if (status !== "unauthorized") return null;

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
      <p className="font-medium">Your session has expired.</p>
      <p className="mt-1">
        Please{" "}
        <Link href="/sign-in" className="underline underline-offset-4">
          sign in again
        </Link>
        .
      </p>
    </div>
  );
}

