"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

/**
 * ProjectBulletsPanel component
 * Manages project bullets (evidence items) with search and filter support.
 * @param {string} projectId - Optional project ID. If not provided, searches across all projects.
 */
export function ProjectBulletsPanel({ projectId: initialProjectId = null }) {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [bullets, setBullets] = useState([]);
  const [selectedBullet, setSelectedBullet] = useState(null);
  const [mode, setMode] = useState("list"); // list | create | edit
  const [status, setStatus] = useState("loading"); // loading | idle | saving | saved | error
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // bullet id to confirm deletion

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Form state
  const [formValues, setFormValues] = useState({
    text: "",
    title: "",
    tags: "",
    impact: "",
  });

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load projects on mount (if no initial project ID)
  useEffect(() => {
    if (!initialProjectId) {
      loadProjects();
    } else {
      setStatus("idle");
    }
  }, [initialProjectId]);

  // Load bullets when project, search, or filter changes
  useEffect(() => {
    loadBullets();
  }, [selectedProjectId, debouncedSearch, tagFilter]);

  async function loadProjects() {
    try {
      setStatus("loading");
      const response = await fetch("/api/projects", { cache: "no-store" });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setError("Failed to load projects.");
        setStatus("error");
        return;
      }

      setProjects(result.data || []);
      setStatus("idle");
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError("Failed to load projects.");
      setStatus("error");
    }
  }

  async function loadBullets() {
    try {
      setStatus("loading");

      // Build query params
      const params = new URLSearchParams();
      if (selectedProjectId) params.append("projectId", selectedProjectId);
      if (debouncedSearch) params.append("q", debouncedSearch);
      if (tagFilter) params.append("tag", tagFilter);

      const response = await fetch(`/api/project-bullets?${params.toString()}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setError("Failed to load bullets. Click Retry below.");
        setStatus("error");
        return;
      }

      setBullets(result.data || []);
      setStatus("idle");
    } catch (err) {
      console.error("Failed to fetch bullets:", err);
      setError("Failed to load bullets. Click Retry below.");
      setStatus("error");
    }
  }

  function handleClearFilters() {
    setSearchQuery("");
    setTagFilter("");
    setDebouncedSearch("");
  }

  function handleNew() {
    setFormValues({ text: "", title: "", tags: "", impact: "" });
    setSelectedBullet(null);
    setMode("create");
    setError(null);
  }

  function handleEdit(bullet) {
    setFormValues({
      text: bullet.text || "",
      title: bullet.title || "",
      tags: bullet.tags ? bullet.tags.join(", ") : "",
      impact: bullet.impact || "",
    });
    setSelectedBullet(bullet);
    setMode("edit");
    setError(null);
  }

  function handleCancel() {
    setMode("list");
    setSelectedBullet(null);
    setFormValues({ text: "", title: "", tags: "", impact: "" });
    setError(null);
  }

  async function handleSave() {
    if (!formValues.text.trim()) {
      setError("Bullet text is required.");
      return;
    }

    try {
      setStatus("saving");
      setError(null);

      // Parse tags from comma-separated string
      const tagsArray = formValues.tags
        ? formValues.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : null;

      const payload = {
        text: formValues.text,
        title: formValues.title || null,
        tags: tagsArray,
        impact: formValues.impact || null,
      };

      // Add projectId for create mode
      if (mode === "create") {
        payload.projectId = selectedProjectId;
      }

      const url = mode === "create" ? "/api/project-bullets" : `/api/project-bullets/${selectedBullet.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setError(result.error.message || `Failed to ${mode === "create" ? "create" : "update"} bullet.`);
        setStatus("error");
        return;
      }

      // Refresh list and show saved state
      await loadBullets();
      setMode("list");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      console.error(`Failed to ${mode === "create" ? "create" : "update"} bullet:`, err);
      setError(`Failed to ${mode === "create" ? "create" : "update"} bullet. Please try again.`);
      setStatus("error");
    }
  }

  async function handleDelete(bulletId) {
    try {
      setStatus("saving");
      setError(null);

      const response = await fetch(`/api/project-bullets/${bulletId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        return;
      }

      const result = await response.json();

      if (result.error) {
        setError("Failed to delete bullet.");
        setStatus("error");
        return;
      }

      // Refresh list
      await loadBullets();
      setDeleteConfirm(null);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      console.error("Failed to delete bullet:", err);
      setError("Failed to delete bullet. Please try again.");
      setStatus("error");
    }
  }

  // Project selector (if no initial project ID)
  if (!initialProjectId && !selectedProjectId) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Project Bullets</h2>

        {status === "loading" && <p className="text-muted-foreground">Loading projects...</p>}

        {status === "error" && (
          <div className="space-y-2">
            <p className="text-destructive">{error}</p>
            <Button onClick={loadProjects} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        )}

        {status !== "loading" && projects.length === 0 && (
          <p className="text-muted-foreground">No projects found. Create a project first.</p>
        )}

        {status !== "loading" && projects.length > 0 && (
          <div>
            <Label htmlFor="project-select">Select a project to manage bullets:</Label>
            <select
              id="project-select"
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2"
            >
              <option value="">-- Select Project --</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    );
  }

  // Main bullets list/form view
  if (mode === "list") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Project Bullets</h2>
          <Button onClick={handleNew} disabled={status === "loading"}>
            New Bullet
          </Button>
        </div>

        {status === "loading" && <p className="text-muted-foreground">Loading...</p>}

        {status === "error" && (
          <div className="space-y-2">
            <p className="text-destructive">{error}</p>
            <Button onClick={loadBullets} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        )}

        {status === "saved" && (
          <p className="text-green-600 dark:text-green-400">Saved successfully!</p>
        )}

        {status !== "loading" && bullets.length === 0 && (
          <p className="text-muted-foreground">No bullets yet. Create your first bullet to get started.</p>
        )}

        <div className="space-y-4">
          {bullets.map((bullet) => (
            <Card key={bullet.id}>
              <CardHeader>
                {bullet.title && <CardTitle>{bullet.title}</CardTitle>}
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">{bullet.text}</p>
                {bullet.tags && bullet.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {bullet.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {bullet.impact && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Impact:</strong> {bullet.impact}
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button onClick={() => handleEdit(bullet)} variant="outline" size="sm">
                  Edit
                </Button>
                {deleteConfirm === bullet.id ? (
                  <>
                    <Button
                      onClick={() => handleDelete(bullet.id)}
                      variant="destructive"
                      size="sm"
                      disabled={status === "saving"}
                    >
                      Confirm Delete
                    </Button>
                    <Button onClick={() => setDeleteConfirm(null)} variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setDeleteConfirm(bullet.id)} variant="ghost" size="sm">
                    Delete
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Create or Edit mode
  return (
    <div className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">{mode === "create" ? "New Bullet" : "Edit Bullet"}</h2>

      {error && <p className="text-destructive">{error}</p>}

      <div className="space-y-4">
        <div>
          <Label htmlFor="text">Bullet Text *</Label>
          <Textarea
            id="text"
            value={formValues.text}
            onChange={(e) => setFormValues({ ...formValues, text: e.target.value })}
            placeholder="1-3 sentences describing this evidence/accomplishment..."
            rows={3}
            disabled={status === "saving"}
          />
        </div>

        <div>
          <Label htmlFor="title">Title (Optional)</Label>
          <Input
            id="title"
            value={formValues.title}
            onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
            placeholder="e.g., Improved Performance"
            disabled={status === "saving"}
          />
        </div>

        <div>
          <Label htmlFor="tags">Tags (Optional, comma-separated)</Label>
          <Input
            id="tags"
            value={formValues.tags}
            onChange={(e) => setFormValues({ ...formValues, tags: e.target.value })}
            placeholder="e.g., frontend, react, optimization"
            disabled={status === "saving"}
          />
        </div>

        <div>
          <Label htmlFor="impact">Impact / Metrics (Optional)</Label>
          <Textarea
            id="impact"
            value={formValues.impact}
            onChange={(e) => setFormValues({ ...formValues, impact: e.target.value })}
            placeholder="e.g., Reduced load time by 40%, increased conversions by 25%"
            rows={2}
            disabled={status === "saving"}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={status === "saving"}>
          {status === "saving" ? "Saving..." : "Save"}
        </Button>
        <Button onClick={handleCancel} variant="outline" disabled={status === "saving"}>
          Cancel
        </Button>
        {status === "error" && (
          <Button onClick={handleSave} variant="ghost" size="sm">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
