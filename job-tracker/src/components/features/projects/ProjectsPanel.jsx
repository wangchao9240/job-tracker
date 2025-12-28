"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

/**
 * ProjectsPanel component
 * Main component for managing projects/experiences (list, create, edit, delete).
 * Uses React Query for server state management with caching and automatic retries.
 */
export function ProjectsPanel() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState(null);
  const [mode, setMode] = useState("list"); // list | create | edit
  const [error, setError] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // project id to confirm deletion
  const [showSavedMessage, setShowSavedMessage] = useState(false);

  // Form state
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    role: "",
    techStack: "",
  });

  // Fetch projects using React Query
  const {
    data: projects = [],
    isLoading,
    isError,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async ({ signal }) => {
      const response = await fetch("/api/projects", {
        cache: "no-store",
        signal,
      });

      if (response.status === 401) {
        router.replace("/sign-in");
        throw new Error("Unauthorized");
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || "Failed to load projects");
      }

      return result.data || [];
    },
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: async (values) => {
      const controller = new AbortController();
      try {
        const response = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/sign-in");
          throw new Error("Unauthorized");
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error.message || "Failed to create project");
        }

        return result.data;
      } finally {
        controller.abort();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setMode("list");
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
    },
    onError: (err) => {
      setError(err.message || "Failed to create project. Please try again.");
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, values }) => {
      const controller = new AbortController();
      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/sign-in");
          throw new Error("Unauthorized");
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error.message || "Failed to update project");
        }

        return result.data;
      } finally {
        controller.abort();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setMode("list");
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
    },
    onError: (err) => {
      setError(err.message || "Failed to update project. Please try again.");
    },
  });

  // Delete project mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const controller = new AbortController();
      try {
        const response = await fetch(`/api/projects/${id}`, {
          method: "DELETE",
          signal: controller.signal,
        });

        if (response.status === 401) {
          router.replace("/sign-in");
          throw new Error("Unauthorized");
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error.message || "Failed to delete project");
        }

        return result.data;
      } finally {
        controller.abort();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteConfirm(null);
      setShowSavedMessage(true);
      setTimeout(() => setShowSavedMessage(false), 2000);
    },
    onError: (err) => {
      setError(err.message || "Failed to delete project. Please try again.");
    },
  });

  function handleNew() {
    setFormValues({ name: "", description: "", role: "", techStack: "" });
    setSelectedProject(null);
    setMode("create");
    setError(null);
  }

  function handleEdit(project) {
    setFormValues({
      name: project.name || "",
      description: project.description || "",
      role: project.role || "",
      techStack: project.techStack || "",
    });
    setSelectedProject(project);
    setMode("edit");
    setError(null);
  }

  function handleCancel() {
    setMode("list");
    setSelectedProject(null);
    setFormValues({ name: "", description: "", role: "", techStack: "" });
    setError(null);
  }

  async function handleSave() {
    if (!formValues.name.trim()) {
      setError("Project name is required.");
      return;
    }

    setError(null);

    if (mode === "create") {
      createMutation.mutate(formValues);
    } else {
      updateMutation.mutate({ id: selectedProject.id, values: formValues });
    }
  }

  async function handleDelete(projectId) {
    setError(null);
    deleteMutation.mutate(projectId);
  }

  const isSaving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  if (mode === "list") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Projects &amp; Experiences</h2>
          <Button onClick={handleNew} disabled={isLoading}>
            New Project
          </Button>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading...</p>}

        {isError && (
          <div className="space-y-2">
            <p className="text-destructive">{queryError?.message || "Failed to load projects. Click Retry below."}</p>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        )}

        {showSavedMessage && <p className="text-green-600 dark:text-green-400">Saved successfully!</p>}

        {!isLoading && !isError && projects.length === 0 && (
          <p className="text-muted-foreground">No projects yet. Create your first project to get started.</p>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader>
                <CardTitle>{project.name}</CardTitle>
                {project.role && <CardDescription>{project.role}</CardDescription>}
              </CardHeader>
              {(project.description || project.techStack) && (
                <CardContent className="space-y-2">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
                  )}
                  {project.techStack && (
                    <p className="text-sm">
                      <strong>Tech:</strong> {project.techStack}
                    </p>
                  )}
                </CardContent>
              )}
              <CardFooter className="flex gap-2">
                <Button onClick={() => handleEdit(project)} variant="outline" size="sm">
                  Edit
                </Button>
                {deleteConfirm === project.id ? (
                  <>
                    <Button
                      onClick={() => handleDelete(project.id)}
                      variant="destructive"
                      size="sm"
                      disabled={isSaving}
                    >
                      Confirm Delete
                    </Button>
                    <Button onClick={() => setDeleteConfirm(null)} variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setDeleteConfirm(project.id)} variant="ghost" size="sm">
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
      <h2 className="text-2xl font-bold">{mode === "create" ? "New Project" : "Edit Project"}</h2>

      {error && <p className="text-destructive">{error}</p>}

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Project Name *</Label>
          <Input
            id="name"
            value={formValues.name}
            onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
            placeholder="e.g., E-commerce Platform"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={formValues.role}
            onChange={(e) => setFormValues({ ...formValues, role: e.target.value })}
            placeholder="e.g., Frontend Developer"
            disabled={isSaving}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formValues.description}
            onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
            placeholder="Brief project description..."
            rows={4}
            disabled={isSaving}
          />
        </div>

        <div>
          <Label htmlFor="techStack">Tech Stack</Label>
          <Input
            id="techStack"
            value={formValues.techStack}
            onChange={(e) => setFormValues({ ...formValues, techStack: e.target.value })}
            placeholder="e.g., React, Node.js, PostgreSQL"
            disabled={isSaving}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
        <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
          Cancel
        </Button>
        {error && (
          <Button onClick={handleSave} variant="ghost" size="sm">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
