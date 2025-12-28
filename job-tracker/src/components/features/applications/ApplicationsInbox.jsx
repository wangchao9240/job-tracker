"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApplicationList } from "./ApplicationList";
import { ApplicationDetail } from "./ApplicationDetail";
import { ApplicationForm } from "./ApplicationForm";
import { ApplicationFilters } from "./ApplicationFilters";
import { PasteUrlForm } from "./PasteUrlForm";

/**
 * ApplicationsInbox component
 * 2-panel layout: list on left, detail/create on right.
 * Uses URL query params for selection and filter persistence.
 */
export function ApplicationsInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  // Extract URL params
  const applicationIdParam = searchParams.get("applicationId");
  const statusParam = searchParams.get("status");
  const sourceParam = searchParams.get("source");
  const qParam = searchParams.get("q");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const [applications, setApplications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [mode, setMode] = useState("view"); // view | create
  const [status, setStatus] = useState("loading"); // loading | idle | error
  const [error, setError] = useState(null);
  const [ingestionResult, setIngestionResult] = useState(null); // Result from URL paste
  const [createPrefill, setCreatePrefill] = useState(null); // Prefill values for create flow
  const [createError, setCreateError] = useState(null);

  // Debounce ref for search
  const debounceRef = useRef(null);

  // Get current filters from URL
  const filters = useMemo(() => ({
    status: statusParam || null,
    source: sourceParam || null,
    q: qParam || null,
    from: fromParam || null,
    to: toParam || null,
  }), [statusParam, sourceParam, qParam, fromParam, toParam]);

  // Build API URL with filters
  const buildApiUrl = useCallback((filterOverrides = {}) => {
    const currentFilters = { ...filters, ...filterOverrides };
    const params = new URLSearchParams();

    if (currentFilters.status) params.set("status", currentFilters.status);
    if (currentFilters.source) params.set("source", currentFilters.source);
    if (currentFilters.q) params.set("q", currentFilters.q);
    if (currentFilters.from) params.set("from", currentFilters.from);
    if (currentFilters.to) params.set("to", currentFilters.to);

    const queryString = params.toString();
    return queryString ? `/api/applications?${queryString}` : "/api/applications";
  }, [filters]);

  // Update URL with new params
  const updateUrl = useCallback((updates) => {
    const params = new URLSearchParams(searchParamsString);

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    const newUrl = params.toString() ? `?${params.toString()}` : "/";
    const currentUrl = searchParamsString ? `?${searchParamsString}` : "/";
    if (newUrl === currentUrl) return;
    router.replace(newUrl, { scroll: false });
  }, [router, searchParamsString]);

  // Handle filter changes with debounce for search
  const handleFilterChange = useCallback((newFilters) => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Check if search query changed
    const searchChanged = newFilters.q !== filters.q;

    if (searchChanged && newFilters.q) {
      // Debounce search input
      debounceRef.current = setTimeout(() => {
        updateUrl({
          status: newFilters.status,
          source: newFilters.source,
          q: newFilters.q,
          from: newFilters.from,
          to: newFilters.to,
        });
      }, 300);
    } else {
      // Immediate update for other filters
      updateUrl({
        status: newFilters.status,
        source: newFilters.source,
        q: newFilters.q,
        from: newFilters.from,
        to: newFilters.to,
      });
    }
  }, [filters.q, updateUrl]);

  // Fetch applications with filters
  useEffect(() => {
    let isMounted = true;

    async function fetchDetail(id) {
      try {
        const response = await fetch(`/api/applications/${id}`, {
          cache: "no-store",
        });

        if (!isMounted) return null;

        if (response.status === 401) {
          router.replace("/sign-in");
          return null;
        }

        if (response.status === 404) {
          return null;
        }

        const result = await response.json();
        if (result.error) {
          return null;
        }

        return result.data;
      } catch (err) {
        console.log(
          JSON.stringify({
            level: "error",
            message: "Failed to fetch application detail",
            error: err.message,
          })
        );
        return null;
      }
    }

    async function fetchReminders() {
      try {
        const response = await fetch("/api/reminders", { cache: "no-store" });
        if (!isMounted) return [];

        if (response.status === 401) {
          return [];
        }

        const result = await response.json();
        if (result.error) {
          return [];
        }

        return result.data || [];
      } catch (err) {
        console.log(
          JSON.stringify({
            level: "error",
            message: "Failed to fetch reminders",
            error: err.message,
          })
        );
        return [];
      }
    }

    async function loadApplications() {
      try {
        setStatus("loading");

        // Fetch applications and reminders in parallel
        const apiUrl = buildApiUrl();
        const [appResponse, remindersData] = await Promise.all([
          fetch(apiUrl, { cache: "no-store" }),
          fetchReminders(),
        ]);

        if (!isMounted) return;

        if (appResponse.status === 401) {
          router.replace("/sign-in");
          return;
        }

        const result = await appResponse.json();

        if (!isMounted) return;

        if (result.error) {
          setError("Failed to load applications.");
          setStatus("error");
          return;
        }

        const apps = result.data || [];
        setApplications(apps);
        setReminders(remindersData);
        setStatus("idle");

        // When creating a new application, don't auto-select an existing one.
        if (mode === "create") {
          setSelectedApplication(null);
          return;
        }

        // Handle selection
        if (apps.length > 0) {
          const targetId = applicationIdParam;
          if (targetId) {
            const found = apps.find((a) => a.id === targetId);
            if (found) {
              // Selected item is in filtered list
              const detail = await fetchDetail(found.id);
              if (isMounted && detail) {
                setSelectedApplication(detail);
                setMode("view");
              }
            } else {
              // Selected item not in filtered list - keep selection but show it's filtered out
              // Or clear and select first - we'll select first for simplicity
              const detail = await fetchDetail(apps[0].id);
              if (isMounted && detail) {
                setSelectedApplication(detail);
                updateUrl({ applicationId: apps[0].id });
                setMode("view");
              }
            }
          } else {
            // No selection param, select first
            const detail = await fetchDetail(apps[0].id);
            if (isMounted && detail) {
              setSelectedApplication(detail);
              updateUrl({ applicationId: apps[0].id });
              setMode("view");
            }
          }
        } else {
          // No results after filter
          setSelectedApplication(null);
        }
      } catch (err) {
        if (!isMounted) return;
        console.log(
          JSON.stringify({
            level: "error",
            message: "Failed to fetch applications list",
            error: err.message,
          })
        );
        setError("Failed to load applications.");
        setStatus("error");
      }
    }

    loadApplications();

    return () => {
      isMounted = false;
    };
  }, [router, applicationIdParam, buildApiUrl, updateUrl, mode]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const loadApplicationDetail = async (id) => {
    try {
      const response = await fetch(`/api/applications/${id}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      if (response.status === 404) {
        setSelectedApplication(null);
        updateUrl({ applicationId: null });
        return;
      }

      const result = await response.json();

      if (result.error) {
        setSelectedApplication(null);
        return;
      }

      setSelectedApplication(result.data);
      setMode("view");
    } catch (err) {
      console.log(
        JSON.stringify({
          level: "error",
          message: "Failed to fetch application detail for selection",
          error: err.message,
        })
      );
    }
  };

  const selectApplication = (app) => {
    updateUrl({ applicationId: app.id });
    loadApplicationDetail(app.id);
  };

  const viewExistingApplication = (applicationId) => {
    updateUrl({ applicationId });
    setMode("view");
    loadApplicationDetail(applicationId);
  };

  const handleCreate = async (values) => {
    try {
      setCreateError(null);
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          ...(createPrefill?.source ? { source: createPrefill.source } : {}),
          ...(createPrefill?.allowDuplicateUrl ? { allowDuplicateUrl: true } : {}),
        }),
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        const message =
          result.error.message ||
          (result.error.code === "DUPLICATE_URL"
            ? "This job link already exists in your applications."
            : "Failed to create application");
        setCreateError(message);
        return;
      }

      // Clear filters and refresh list to show new application
      const listResponse = await fetch("/api/applications", { cache: "no-store" });
      const listResult = await listResponse.json();
      if (!listResult.error) {
        setApplications(listResult.data || []);
      }

      // Clear filters and select the newly created application
      updateUrl({
        applicationId: result.data.id,
        status: null,
        source: null,
        q: null,
        from: null,
        to: null,
      });
      setSelectedApplication(result.data);
      setMode("view");
      setCreatePrefill(null);
      setIngestionResult(null);
    } catch (err) {
      setCreateError("Failed to create application. Please try again.");
    }
  };

  const handleUpdate = (updatedApp) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === updatedApp.id ? updatedApp : app))
    );
    setSelectedApplication(updatedApp);
  };

  const handleDismissReminder = (reminderId) => {
    // Remove the dismissed reminder from state
    setReminders((prev) => prev.filter((r) => r.id !== reminderId));
  };

  const handleUrlPasteSuccess = async (result) => {
    // Store ingestion result for showing missing fields message (during create)
    setIngestionResult(result);

    // Start create flow and prefill the form (do not write to DB until user submits required fields)
    setMode("create");
    setSelectedApplication(null);
    updateUrl({ applicationId: null });
    setCreateError(null);

    setCreatePrefill({
      company: result?.extracted?.company || "",
      role: result?.extracted?.role || "",
      link: result?.normalizedUrl || "",
      status: "draft",
      source: result?.source || "unknown",
      allowDuplicateUrl: !!result?.allowDuplicateUrl,
    });
  };

  const clearIngestionResult = () => {
    setIngestionResult(null);
  };

  const handleStartCreate = () => {
    setMode("create");
    setSelectedApplication(null);
    updateUrl({ applicationId: null });
    setCreatePrefill(null);
    setIngestionResult(null);
    setCreateError(null);
  };

  const handleCancelCreate = () => {
    setMode("view");
    setIngestionResult(null);
    setCreateError(null);
    if (applications.length > 0) {
      selectApplication(applications[0]);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = filters.status || filters.source || filters.q || filters.from || filters.to;

  // Build a map of applicationId -> reminder for quick lookup
  const remindersByAppId = useMemo(() => {
    const map = {};
    for (const reminder of reminders) {
      map[reminder.applicationId] = reminder;
    }
    return map;
  }, [reminders]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-600 dark:text-zinc-400">
        Loading applications...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  // Empty state - different message if filters are active
  if (applications.length === 0 && mode !== "create") {
    return (
      <div className="flex h-[calc(100vh-12rem)] gap-4">
        {/* Left Panel with Filters */}
        <div className="w-80 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Applications
            </h2>
            <Button size="sm" onClick={handleStartCreate}>
              + New
            </Button>
          </div>
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
            <PasteUrlForm
              onSuccess={handleUrlPasteSuccess}
              onViewExisting={selectApplication}
            />
          </div>
          <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
            <ApplicationFilters filters={filters} onFilterChange={handleFilterChange} />
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                {hasActiveFilters ? "No matching applications" : "No applications yet"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={() => handleFilterChange({ status: null, source: null, q: null, from: null, to: null })}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 flex items-center justify-center">
          {!hasActiveFilters && (
            <div className="text-center">
              <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                Get started by creating your first application
              </p>
              <Button onClick={handleStartCreate}>Create Application</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      {/* Left Panel: Filters + List */}
      <div className="w-80 shrink-0 flex flex-col border-r border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            Applications
            {hasActiveFilters && (
              <span className="ml-2 text-sm font-normal text-zinc-500">
                ({applications.length})
              </span>
            )}
          </h2>
          <Button size="sm" onClick={handleStartCreate}>
            + New
          </Button>
        </div>
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
          <PasteUrlForm
            onSuccess={handleUrlPasteSuccess}
            onViewExisting={viewExistingApplication}
          />
        </div>
        <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
          <ApplicationFilters filters={filters} onFilterChange={handleFilterChange} />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <ApplicationList
            applications={applications}
            onSelect={selectApplication}
            selectedId={selectedApplication?.id}
            remindersByAppId={remindersByAppId}
          />
        </div>
      </div>

      {/* Right Panel: Detail or Create */}
      <div className="flex-1 min-w-0 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700">
        {mode === "create" ? (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-6 py-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                New Application
              </h2>
              <Button variant="ghost" size="sm" onClick={handleCancelCreate}>
                Cancel
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {ingestionResult && (
                <div className="mb-4 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    {ingestionResult.missing?.length === 0
                      ? "Job details extracted successfully"
                      : "Partially extracted from URL"}
                  </p>
                  {Array.isArray(ingestionResult.warnings) && ingestionResult.warnings.length > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                      {ingestionResult.warnings[0].message}
                    </p>
                  )}
                </div>
              )}
              {/* Weak warning: company+role duplicate (non-blocking) */}
	              {ingestionResult?.duplicates?.companyRoleMatches?.length > 0 && (
	                <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
	                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
	                    Possible duplicate found
	                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    You have an existing application with the same company and role:
                  </p>
                  {ingestionResult.duplicates.companyRoleMatches.slice(0, 2).map((match) => (
                    <p key={match.id} className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      <span className="font-medium">{match.company}</span>
                      {match.role && ` - ${match.role}`}
                      {match.status && ` (${match.status})`}
                    </p>
                  ))}
	                  <p className="text-xs text-amber-500 dark:text-amber-500 mt-2">
	                    You can still create this application if intended.
	                  </p>
	                </div>
	              )}
	              {createError && (
	                <div className="mb-4 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
	                  <p className="text-sm text-red-700 dark:text-red-400">{createError}</p>
	                </div>
	              )}
	              <ApplicationForm
	                key={`create:${createPrefill?.link || "blank"}`}
	                initialValues={createPrefill}
	                onSave={handleCreate}
	                onCancel={handleCancelCreate}
	              />
            </div>
          </div>
        ) : selectedApplication ? (
          <ApplicationDetail
            key={selectedApplication.id}
            application={selectedApplication}
            onUpdate={handleUpdate}
            reminder={remindersByAppId[selectedApplication.id]}
            onDismissReminder={handleDismissReminder}
            ingestionResult={ingestionResult}
            onClearIngestionResult={clearIngestionResult}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400">
            Select an application to view details
          </div>
        )}
      </div>
    </div>
  );
}
