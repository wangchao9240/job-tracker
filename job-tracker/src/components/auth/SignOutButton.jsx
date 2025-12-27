"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * SignOutButton component
 * Calls the sign-out API and redirects to /sign-in on success.
 */
export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSignOut = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
      });

      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok || result?.error) {
        setError("Failed to sign out. Please try again.");
        return;
      }

      router.replace("/sign-in?reason=signed_out");
    } catch (err) {
      console.error("Sign out error:", err);
      setError("Failed to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="outline" onClick={handleSignOut} disabled={isLoading}>
        {isLoading ? "Signing out..." : "Sign out"}
      </Button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
