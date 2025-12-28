"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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
  const [editedContent, setEditedContent] = useState(""); // User-edited content
  const [error, setError] = useState(null);
  const [latestDraft, setLatestDraft] = useState(null);
  const abortControllerRef = useRef(null);

  // Constraints state (UI-only, persisted per application across retries)
  const [tone, setTone] = useState("");
  const [emphasis, setEmphasis] = useState("");
  const [keywordsIncludeInput, setKeywordsIncludeInput] = useState("");
  const [keywordsAvoidInput, setKeywordsAvoidInput] = useState("");

  // Submitted versions state
  const [submittedVersions, setSubmittedVersions] = useState([]);
  const [selectedSubmittedVersion, setSelectedSubmittedVersion] = useState(null);
  const [isSavingSubmitted, setIsSavingSubmitted] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Submission notes state (for selected submitted version)
  const [submissionWhere, setSubmissionWhere] = useState("");
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState(null);

  // Load latest draft and submitted versions on mount
  useEffect(() => {
    if (applicationId) {
      loadLatestDraft();
      loadSubmittedVersions();
    }
  }, [applicationId]);

  // Populate notes fields when a submitted version is selected
  useEffect(() => {
    if (selectedSubmittedVersion) {
      setSubmissionWhere(selectedSubmittedVersion.submissionWhere || "");
      setSubmissionNotes(selectedSubmittedVersion.submissionNotes || "");
      setSubmittedAt(selectedSubmittedVersion.submittedAt || "");
      setNotesError(null);
    }
  }, [selectedSubmittedVersion]);

  async function loadLatestDraft() {
    try {
      const response = await fetch(`/api/cover-letter/latest?applicationId=${applicationId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setLatestDraft(result.data);
          setDraftContent(result.data.content);
          setEditedContent(result.data.content); // Initialize edited content
        }
      }
    } catch (err) {
      console.error("Failed to load latest draft:", err);
    }
  }

  async function loadSubmittedVersions() {
    try {
      const response = await fetch(`/api/cover-letter/submitted?applicationId=${applicationId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.data) {
          setSubmittedVersions(result.data);
        }
      }
    } catch (err) {
      console.error("Failed to load submitted versions:", err);
    }
  }

  async function generateCoverLetter(mode = 'grounded') {
    if (!applicationId) return;

    setStatus("generating");
    setError(null);
    setDraftContent("");

    // Create abort controller for this generation
    abortControllerRef.current = new AbortController();

    // Build constraints object from UI inputs
    const constraints = {};
    if (tone && tone.trim()) {
      constraints.tone = tone.trim();
    }
    if (emphasis && emphasis.trim()) {
      constraints.emphasis = emphasis.trim();
    }
    if (keywordsIncludeInput && keywordsIncludeInput.trim()) {
      constraints.keywordsInclude = keywordsIncludeInput
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }
    if (keywordsAvoidInput && keywordsAvoidInput.trim()) {
      constraints.keywordsAvoid = keywordsAvoidInput
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
    }

    const requestBody = { applicationId, mode };
    // Only include constraints if at least one field is provided
    if (Object.keys(constraints).length > 0) {
      requestBody.constraints = constraints;
    }

    try {
      const response = await fetch("/api/cover-letter/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
      let buffer = "";
      let currentEventType = null;
      let parseErrorCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const newlineIndex = buffer.indexOf("\n");
          if (newlineIndex === -1) break;

          const rawLine = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          const line = rawLine.trim();
          if (!line) continue;

          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);

              if (currentEventType === "delta" && parsed.content) {
                setDraftContent((prev) => prev + parsed.content);
              } else if (currentEventType === "done") {
                setStatus("done");
                await loadLatestDraft();
                setSelectedSubmittedVersion(null);
              } else if (currentEventType === "error") {
                setError(parsed);
                setStatus("error");
              }
            } catch (parseError) {
              parseErrorCount += 1;
            }
          }
        }
      }

      if (parseErrorCount > 0) {
        console.warn("SSE parse errors:", parseErrorCount);
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

  function handleGenerate() {
    generateCoverLetter('grounded');
  }

  function handleGeneratePreview() {
    generateCoverLetter('preview');
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

  async function handleSaveSubmitted() {
    if (!applicationId || !editedContent.trim()) return;

    setIsSavingSubmitted(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/cover-letter/submitted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          content: editedContent,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        setSaveError(result.error || { message: "Failed to save submitted version" });
        setIsSavingSubmitted(false);
        return;
      }

      // Success: reload submitted versions and select the new one
      await loadSubmittedVersions();
      setSelectedSubmittedVersion(result.data);
      setIsSavingSubmitted(false);

      // Show success feedback (will fade after 3s)
      setTimeout(() => {
        // Could add a success toast here if needed
      }, 3000);
    } catch (err) {
      console.error("Failed to save submitted version:", err);
      setSaveError({
        code: "NETWORK_ERROR",
        message: "Failed to connect to server",
      });
      setIsSavingSubmitted(false);
    }
  }

  async function handleSaveSubmissionNotes() {
    if (!selectedSubmittedVersion?.id) return;

    setIsSavingNotes(true);
    setNotesError(null);

    try {
      const response = await fetch(
        `/api/cover-letter/submitted/${selectedSubmittedVersion.id}/notes`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionWhere: submissionWhere || null,
            submissionNotes: submissionNotes || null,
            submittedAt: submittedAt || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        setNotesError(result.error || { message: "Failed to save submission notes" });
        setIsSavingNotes(false);
        return;
      }

      // Success: update the selected version with new data
      setSelectedSubmittedVersion(result.data);
      // Also update in the list
      await loadSubmittedVersions();
      setIsSavingNotes(false);
    } catch (err) {
      console.error("Failed to save submission notes:", err);
      setNotesError({
        code: "NETWORK_ERROR",
        message: "Failed to connect to server",
      });
      setIsSavingNotes(false);
    }
  }

  // Check prerequisites
  const hasJdSnapshot = application?.jdSnapshot;
  const hasConfirmedMapping =
    application?.confirmedMapping &&
    application.confirmedMapping.items &&
    application.confirmedMapping.items.length > 0;

  const canGenerateGrounded = hasJdSnapshot && hasConfirmedMapping;
  const canGeneratePreview = hasJdSnapshot && !hasConfirmedMapping;
  const isGenerating = status === "generating";
  const isPreviewDraft = latestDraft?.kind === 'preview';

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
          {!isGenerating && canGeneratePreview && (
            <Button
              onClick={handleGeneratePreview}
              variant="outline"
              size="sm"
            >
              {latestDraft ? "Regenerate Preview" : "Generate Preview Draft"}
            </Button>
          )}
          {!isGenerating && canGenerateGrounded && (
            <Button
              onClick={handleGenerate}
              size="sm"
            >
              {latestDraft && !isPreviewDraft ? "Regenerate Draft" : "Generate Draft"}
            </Button>
          )}
        </div>
      </div>

      {/* Constraints input (optional customization) */}
      {(canGenerateGrounded || canGeneratePreview) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Generation Options (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="tone">Tone</Label>
                <Input
                  id="tone"
                  placeholder="e.g., professional, friendly, confident"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={isGenerating}
                  maxLength={40}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Describe the desired tone of the letter
                </p>
              </div>

              <div>
                <Label htmlFor="emphasis">Emphasis</Label>
                <Input
                  id="emphasis"
                  placeholder="e.g., Focus on leadership experience"
                  value={emphasis}
                  onChange={(e) => setEmphasis(e.target.value)}
                  disabled={isGenerating}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  What to emphasize in the letter
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="keywordsInclude">Keywords to Include</Label>
                <Input
                  id="keywordsInclude"
                  placeholder="e.g., innovation, collaboration, agile"
                  value={keywordsIncludeInput}
                  onChange={(e) => setKeywordsIncludeInput(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated keywords to include
                </p>
              </div>

              <div>
                <Label htmlFor="keywordsAvoid">Keywords to Avoid</Label>
                <Input
                  id="keywordsAvoid"
                  placeholder="e.g., junior, entry-level"
                  value={keywordsAvoidInput}
                  onChange={(e) => setKeywordsAvoidInput(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Comma-separated keywords to avoid
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing prerequisites warnings */}
      {!canGenerateGrounded && !canGeneratePreview && (
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
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preview draft warning banner */}
      {isPreviewDraft && !isGenerating && (
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <p className="font-medium mb-2">⚠️ Preview Draft (Ungrounded)</p>
            <p className="text-sm mb-2">
              This is a preview draft generated without confirmed evidence mapping.
              It may contain generic content where specific evidence is missing.
            </p>
            <p className="text-sm font-medium">
              To generate an evidence-grounded draft, complete the requirement → bullet mapping
              in the Mapping Workbench first, then click "Generate Draft".
            </p>
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
            {error.details && (
              <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded mb-3">
                {typeof error.details === "string"
                  ? error.details
                  : JSON.stringify(error.details, null, 2)}
              </pre>
            )}
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

      {/* Draft content (editable) or selected submitted version (read-only) */}
      {selectedSubmittedVersion ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Submitted Version</span>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground font-normal">
                    Submitted: {new Date(selectedSubmittedVersion.createdAt).toLocaleString()}
                  </span>
                  <Button
                    onClick={() => setSelectedSubmittedVersion(null)}
                    variant="outline"
                    size="sm"
                  >
                    Back to Draft
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-muted p-4 rounded">
                  {selectedSubmittedVersion.content}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Submission Notes Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Submission Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="submissionWhere">Where Submitted</Label>
                <Input
                  id="submissionWhere"
                  placeholder="e.g., Company Portal, LinkedIn, Email"
                  value={submissionWhere}
                  onChange={(e) => setSubmissionWhere(e.target.value)}
                  disabled={isSavingNotes}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Where this cover letter was submitted
                </p>
              </div>

              <div>
                <Label htmlFor="submissionNotes">Submission Notes</Label>
                <Textarea
                  id="submissionNotes"
                  placeholder="e.g., Applied via referral, mentioned networking event"
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  disabled={isSavingNotes}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Additional notes about this submission
                </p>
              </div>

              <div>
                <Label htmlFor="submittedAt">Submitted At (Optional)</Label>
                <Input
                  id="submittedAt"
                  type="datetime-local"
                  value={submittedAt ? new Date(submittedAt).toISOString().slice(0, 16) : ""}
                  onChange={(e) => setSubmittedAt(e.target.value ? new Date(e.target.value).toISOString() : "")}
                  disabled={isSavingNotes}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When was this submitted? Defaults to creation time if not set.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleSaveSubmissionNotes}
                  disabled={isSavingNotes}
                  size="sm"
                >
                  {isSavingNotes ? "Saving..." : "Save Submission Details"}
                </Button>
                {!isSavingNotes && !notesError && (
                  <span className="text-xs text-muted-foreground">
                    Changes are saved for this version only
                  </span>
                )}
              </div>

              {notesError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
                  <p className="font-medium">❌ Failed to save submission details</p>
                  <p className="mt-1">{notesError.message}</p>
                  <Button
                    onClick={handleSaveSubmissionNotes}
                    variant="outline"
                    size="sm"
                    className="mt-2"
                  >
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (draftContent || latestDraft) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>
                {isGenerating
                  ? "Draft (In Progress)"
                  : isPreviewDraft
                    ? "Preview Draft (Ungrounded) - Editable"
                    : "Latest Draft (Editable)"}
              </span>
              <div className="flex items-center gap-2">
                {latestDraft && (
                  <span className="text-xs text-muted-foreground font-normal">
                    Generated: {new Date(latestDraft.createdAt).toLocaleString()}
                  </span>
                )}
                {!isGenerating && editedContent && (
                  <Button
                    onClick={handleSaveSubmitted}
                    disabled={isSavingSubmitted || !editedContent.trim()}
                    size="sm"
                  >
                    {isSavingSubmitted ? "Saving..." : "Save as Submitted"}
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={isGenerating ? draftContent : editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              disabled={isGenerating}
              className="min-h-[400px] font-mono text-sm"
              placeholder="Your cover letter draft will appear here..."
            />
            {isGenerating && (
              <div className="mt-4">
                <span className="inline-block animate-pulse">▋</span>
              </div>
            )}
            {saveError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm">
                <p className="font-medium">❌ Failed to save</p>
                <p className="mt-1">{saveError.message}</p>
                <Button
                  onClick={handleSaveSubmitted}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!draftContent && !latestDraft && !isGenerating && status !== "error" && (canGenerateGrounded || canGeneratePreview) && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No draft generated yet.</p>
            <p className="text-sm mt-2">
              {canGenerateGrounded
                ? 'Click "Generate Draft" to create your cover letter with evidence.'
                : 'Click "Generate Preview Draft" to create a quick preview (evidence mapping not required).'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submitted Versions History */}
      {submittedVersions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submitted Versions History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {submittedVersions.map((version) => (
                <div
                  key={version.id}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    selectedSubmittedVersion?.id === version.id
                      ? "bg-primary/10 border-primary"
                      : "hover:bg-muted border-border"
                  }`}
                  onClick={() => setSelectedSubmittedVersion(version)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {version.isLatest && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                          Latest
                        </span>
                      )}
                      <span className="text-sm font-medium">
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {version.content.length} characters
                    </span>
                  </div>
                  {selectedSubmittedVersion?.id === version.id && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ✓ Currently viewing
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
