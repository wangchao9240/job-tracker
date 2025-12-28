"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * PasteUrlForm component
 * Allows users to paste a job URL to create a new application.
 * Handles duplicate detection with strong (URL) and weak (company+role) warnings.
 */
export function PasteUrlForm({ onSuccess, onError, onViewExisting }) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error | duplicate
  const [error, setError] = useState(null);
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const parseUrl = async (overrideUrl, allowDuplicateUrl = false) => {
    try {
      setStatus("loading");
      setError(null);
      setDuplicateInfo(null);

      const response = await fetch("/api/ingestion/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: overrideUrl || url.trim(), allowDuplicateUrl }),
      });

      if (response.status === 401) {
        window.location.href = "/sign-in";
        return;
      }

      const result = await response.json();

      // Handle 409 DUPLICATE_URL - show strong warning
      if (response.status === 409 && result.error?.code === "DUPLICATE_URL") {
        setDuplicateInfo({
          type: "url",
          duplicates: result.error.duplicates || [],
        });
        setStatus("duplicate");
        return;
      }

      if (result.error) {
        setError(result.error.message || "Failed to process URL");
        setStatus("error");
        if (onError) {
          onError(result.error);
        }
        return;
      }

      // Success
      setUrl("");
      setStatus("idle");

      if (onSuccess) {
        onSuccess({ ...result.data, allowDuplicateUrl });
      }
    } catch (err) {
      setError("Failed to process URL. Please try again.");
      setStatus("error");
      if (onError) {
        onError({ code: "NETWORK_ERROR", message: err.message });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!url.trim()) {
      return;
    }

    await parseUrl(url.trim(), false);
  };

  const handleCreateAnyway = async () => {
    await parseUrl(url.trim(), true);
  };

  const handleCancel = () => {
    setStatus("idle");
    setDuplicateInfo(null);
    setError(null);
  };

  // Show duplicate warning UI
  if (status === "duplicate" && duplicateInfo?.type === "url") {
    const existing = duplicateInfo.duplicates[0];
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Duplicate URL detected
        </p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          You already have an application for this job:
        </p>
        {existing && (
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            <span className="font-medium">{existing.company || "Unknown"}</span>
            {existing.role && ` - ${existing.role}`}
            {existing.status && ` (${existing.status})`}
          </p>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          {existing && onViewExisting && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                handleCancel();
                onViewExisting(existing.id);
              }}
            >
              View existing
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={handleCreateAnyway}
          >
            Create anyway
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste job URL..."
          disabled={status === "loading"}
          className="flex-1 min-w-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 disabled:opacity-50"
        />
        <Button
          type="submit"
          size="sm"
          disabled={status === "loading" || !url.trim()}
        >
          {status === "loading" ? "..." : "Add"}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </form>
  );
}
