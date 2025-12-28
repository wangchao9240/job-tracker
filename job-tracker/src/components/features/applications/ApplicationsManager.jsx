"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApplicationForm } from "./ApplicationForm";
import { ApplicationList } from "./ApplicationList";

/**
 * ApplicationsManager component
 * Main component for managing applications (list, create, edit).
 */
export function ApplicationsManager() {
  const router = useRouter();
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [mode, setMode] = useState("list"); // list | create | edit
  const [status, setStatus] = useState("loading"); // loading | idle | saving | saved | error
  const [error, setError] = useState(null);

  // Fetch applications on mount
  useEffect(() => {
    let isMounted = true;

    async function loadApplications() {
      try {
        const response = await fetch("/api/applications", { cache: "no-store" });

        if (!isMounted) return;

        if (response.status === 401) {
          router.replace("/sign-in");
          return;
        }

        const result = await response.json();

        if (!isMounted) return;

        if (result.error) {
          setError("Failed to load applications. Click 'Retry' below to try again.");
          setStatus("error");
          return;
        }

        setApplications(result.data || []);
        setStatus("idle");
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to fetch applications:", err);
        setError("Failed to load applications. Click 'Retry' below to try again.");
        setStatus("error");
      }
    }

    loadApplications();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const refreshApplications = async () => {
    try {
      const response = await fetch("/api/applications", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        return;
      }

      setApplications(result.data || []);
    } catch (err) {
      console.error("Failed to refresh applications:", err);
    }
  };

  const handleSelect = async (app) => {
    try {
      setStatus("loading");
      const response = await fetch(`/api/applications/${app.id}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (response.status === 404) {
        setError("Application not found.");
        setStatus("error");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setError("Failed to load application. Click 'Retry' below to try again.");
        setStatus("error");
        return;
      }

      setSelectedApplication(result.data);
      setMode("edit");
      setStatus("idle");
    } catch (err) {
      console.error("Failed to fetch application:", err);
      setError("Failed to load application. Click 'Retry' below to try again.");
      setStatus("error");
    }
  };

  const handleCreate = async (values) => {
    try {
      setStatus("saving");
      setError(null);

      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setError(result.error.message || "Failed to create application. Please try again.");
        setStatus("error");
        return;
      }

      // Refresh list and show saved state
      await refreshApplications();
      setMode("list");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("Failed to create application:", err);
      setError("Failed to create application. Please try again.");
      setStatus("error");
    }
  };

  const handleUpdate = async (values) => {
    if (!selectedApplication) return;

    try {
      setStatus("saving");
      setError(null);

      const response = await fetch(`/api/applications/${selectedApplication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (response.status === 404) {
        setError("Application not found.");
        setStatus("error");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setError(result.error.message || "Failed to save changes. Please try again.");
        setStatus("error");
        return;
      }

      // Refresh list and update selected
      await refreshApplications();
      setSelectedApplication(result.data);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err) {
      console.error("Failed to update application:", err);
      setError("Failed to save changes. Please try again.");
      setStatus("error");
    }
  };

  const handleCancel = () => {
    setMode("list");
    setSelectedApplication(null);
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    setStatus("loading");
    // Trigger a re-render with fresh fetch
    window.location.reload();
  };

  if (status === "loading" && applications.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-600 dark:text-zinc-400">
        Loading applications...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          {mode === "create"
            ? "New Application"
            : mode === "edit"
            ? "Edit Application"
            : "Applications"}
        </h2>
        {mode === "list" && (
          <Button onClick={() => setMode("create")}>+ New Application</Button>
        )}
      </div>

      {/* Status Messages */}
      {status === "saved" && (
        <div className="rounded-md bg-green-50 p-3 dark:bg-green-900/20">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Saved successfully!
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-sm font-medium text-red-700 underline hover:no-underline dark:text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Content */}
      {mode === "list" && (
        <ApplicationList
          applications={applications}
          onSelect={handleSelect}
          selectedId={selectedApplication?.id}
        />
      )}

      {mode === "create" && (
        <ApplicationForm
          key="create"
          onSave={handleCreate}
          onCancel={handleCancel}
          isLoading={status === "saving"}
        />
      )}

      {mode === "edit" && selectedApplication && (
        <ApplicationForm
          key={selectedApplication.id}
          application={selectedApplication}
          onSave={handleUpdate}
          onCancel={handleCancel}
          isLoading={status === "saving"}
        />
      )}
    </div>
  );
}
