"use client";

import { STATUS_LABELS } from "@/lib/utils/applicationStatus";

/**
 * ApplicationList component
 * Displays a list of applications.
 * @param {Object} props
 * @param {Array} props.applications - List of applications
 * @param {Function} props.onSelect - Callback when an application is selected
 * @param {string} props.selectedId - Currently selected application ID
 * @param {Object} props.remindersByAppId - Map of applicationId -> reminder for follow-up badges
 */
export function ApplicationList({ applications, onSelect, selectedId, remindersByAppId = {} }) {
  if (!applications || applications.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        No applications yet. Create your first one!
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {applications.map((app) => {
        const hasReminder = !!remindersByAppId[app.id];
        return (
          <button
            key={app.id}
            onClick={() => onSelect(app)}
            className={`w-full text-left p-4 rounded-lg border transition-colors ${
              selectedId === app.id
                ? "border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800"
                : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {app.role}
                  </h3>
                  {hasReminder && (
                    <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      Follow up
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                  {app.company}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs px-2 py-1 rounded-full ${getStatusStyle(
                  app.status
                )}`}
              >
                {STATUS_LABELS[app.status] || app.status}
              </span>
            </div>
            {app.appliedDate && (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                Applied: {formatDate(app.appliedDate)}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

function getStatusStyle(status) {
  switch (status) {
    case "draft":
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
    case "applied":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "interview":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    case "offer":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "withdrawn":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    default:
      return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
  }
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
