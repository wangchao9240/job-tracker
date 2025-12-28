"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Cover Letter Panel component
 * Displays cover letter generation interface with streaming support
 *
 * @param {Object} props
 * @param {string} props.applicationId - Application ID
 * @param {Object} props.application - Application object
 */
export function CoverLetterPanel({ applicationId, application }) {
  const [status, setStatus] = useState("idle"); // idle | generating | done | error
  const [draftContent, setDraftContent] = useState("");
  const [error, setError] = useState(null);
  const [latestDraft, setLatestDraft] = useState(null);
  const abortControllerRef = useRef(null);

  // Load latest draft on mount
  useEffect(() => {
    if (applicationId) {
      loadLatestDraft();
    }
  }, [applicationId]);

  async function loadLatestDraft() {
    try {
      const response = await fetch(`/api/cover-letter/latest?applicationId=${applicationId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setLatestDraft(result.data);
          setDraftContent(result.data.content);
        }
      }
    } catch (err) {
      console.error("Failed to load latest draft:", err);
    }
  }

  async function handleGenerate() {
    if (!applicationId) return;

    setStatus("generating");
    setError(null);
    setDraftContent("");

    // Create abort controller for this generation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/cover-letter/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error);
        setStatus("error");
        return;
      }

      // Process SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7).trim();
            continue; // Event type is parsed, wait for data
          }

          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              // Get the last event type from previous line
              const eventMatch = chunk.match(/event: (\w+)\ndata:/);
              const eventType = eventMatch ? eventMatch[1] : null;

              if (eventType === "delta" && parsed.content) {
                setDraftContent((prev) => prev + parsed.content);
              } else if (eventType === "done") {
                setStatus("done");
                // Reload latest draft after generation
                await loadLatestDraft();
              } else if (eventType === "error") {
                setError(parsed);
                setStatus("error");
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", data);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Generation aborted by user");
        setStatus("idle");
      } else {
        console.error("Generation error:", err);
        setError({
          code: "NETWORK_ERROR",
          message: "Failed to connect to generation service",
        });
        setStatus("error");
      }
    }
  }

  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
  }

  function handleRetry() {
    handleGenerate();
  }

  // Check prerequisites
  const hasJdSnapshot = application?.jdSnapshot;
  const hasConfirmedMapping =
    application?.confirmedMapping &&
    application.confirmedMapping.items &&
    application.confirmedMapping.items.length > 0;

  const canGenerate = hasJdSnapshot && hasConfirmedMapping;
  const isGenerating = status === "generating";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cover Letter</h2>
        <div className="flex gap-2">
          {isGenerating && (
            <Button onClick={handleCancel} variant="outline" size="sm">
              Cancel
            </Button>
          )}
          {!isGenerating && (
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              size="sm"
            >
              {latestDraft ? "Regenerate Draft" : "Generate Draft"}
            </Button>
          )}
        </div>
      </div>

      {/* Missing prerequisites warnings */}
      {!canGenerate && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <p className="font-medium mb-2">⚠️ Prerequisites Missing</p>
            <p className="text-sm mb-3">
              Before generating a cover letter, you need to:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              {!hasJdSnapshot && (
                <li>
                  Paste the job description (JD) for this application
                </li>
              )}
              {!hasConfirmedMapping && (
                <li>
                  Confirm the requirement → bullet mapping in the Mapping
                  Workbench
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Status indicators */}
      {isGenerating && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              ⏳ Generating your cover letter... This may take a minute.
            </p>
          </CardContent>
        </Card>
      )}

      {status === "error" && error && (
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <p className="font-medium mb-2">❌ Generation Failed</p>
            <p className="text-sm mb-3">{error.message}</p>
            {error.code === "JD_SNAPSHOT_REQUIRED" && (
              <p className="text-sm mb-2">
                Please paste the job description first.
              </p>
            )}
            {error.code === "CONFIRMED_MAPPING_REQUIRED" && (
              <p className="text-sm mb-2">
                Please confirm the mapping in the Mapping Workbench first.
              </p>
            )}
            <Button onClick={handleRetry} variant="outline" size="sm">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Draft content */}
      {(draftContent || latestDraft) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {isGenerating ? "Draft (In Progress)" : "Latest Draft"}
              </span>
              {latestDraft && (
                <span className="text-xs text-muted-foreground font-normal">
                  Generated: {new Date(latestDraft.createdAt).toLocaleString()}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                {draftContent}
              </pre>
            </div>
            {isGenerating && (
              <div className="mt-4">
                <span className="inline-block animate-pulse">▋</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!draftContent && !latestDraft && !isGenerating && status !== "error" && canGenerate && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No draft generated yet.</p>
            <p className="text-sm mt-2">Click "Generate Draft" to create your cover letter.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
