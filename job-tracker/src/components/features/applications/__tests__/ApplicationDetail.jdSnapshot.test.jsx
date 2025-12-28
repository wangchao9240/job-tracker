/**
 * Unit tests for ApplicationDetail JD Snapshot functionality (Story 3-3)
 * Tests manual JD paste, storage, and validation warnings
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ApplicationDetail } from "../ApplicationDetail";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: jest.fn(),
  }),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("ApplicationDetail - JD Snapshot (Story 3-3)", () => {
  let mockApplication;
  let mockOnUpdate;
  let mockOnClose;

  beforeEach(() => {
    jest.clearAllMocks();

    mockApplication = {
      id: "app-123",
      company: "Test Co",
      role: "Developer",
      link: "https://test.com/job",
      status: "draft",
      appliedDate: null,
      notes: null,
      location: "Sydney, NSW",
      jdSnapshot: null,
      createdAt: "2025-12-27T00:00:00Z",
      updatedAt: "2025-12-27T01:00:00Z",
    };

    mockOnUpdate = jest.fn();
    mockOnClose = jest.fn();

    // Mock timeline fetch
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [], error: null }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("JD Snapshot UI rendering", () => {
    it("should render JD textarea with empty state", async () => {
      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        expect(textarea).toBeInTheDocument();
        expect(textarea.value).toBe("");
      });
    });

    it("should render JD textarea with existing JD content", async () => {
      const jdContent = "Job Description:\n\nWe are looking for a developer...";
      mockApplication.jdSnapshot = jdContent;

      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        expect(textarea.value).toBe(jdContent);
      });
    });

    it("should display character count when JD exists", async () => {
      mockApplication.jdSnapshot = "A".repeat(5000);

      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/5,000 characters/i)).toBeInTheDocument();
      });
    });

    it("should show 'Job description needed' warning when JD is empty", async () => {
      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/job description needed/i)).toBeInTheDocument();
        expect(screen.getByText(/paste the job description below/i)).toBeInTheDocument();
      });
    });

    it("should NOT show 'Job description needed' warning when JD exists", async () => {
      mockApplication.jdSnapshot = "Job description content";

      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/job description needed/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("JD length validation warnings", () => {
    it("should show warning for JD between 50K-100K characters", async () => {
      mockApplication.jdSnapshot = "A".repeat(60000);

      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/⚠️ Job description is large/i)).toBeInTheDocument();
        expect(screen.getByText(/60,000 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/consider summarizing/i)).toBeInTheDocument();
      });
    });

    it("should show error for JD exceeding 100K characters", async () => {
      mockApplication.jdSnapshot = "A".repeat(120000);

      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/❌ Job description exceeds maximum length/i)).toBeInTheDocument();
        expect(screen.getByText(/120,000\/100,000 characters/i)).toBeInTheDocument();
        expect(screen.getByText(/please reduce content/i)).toBeInTheDocument();
      });
    });

    it("should NOT show warning for JD under 50K characters", async () => {
      mockApplication.jdSnapshot = "A".repeat(10000);

      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/⚠️ Job description is large/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/❌ Job description exceeds/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("JD snapshot save functionality", () => {
    it("should include jdSnapshot in save payload", async () => {
      const jdContent = "New job description content";

      global.fetch.mockImplementation((url) => {
        if (url.includes("/timeline")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [], error: null }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: { ...mockApplication, jdSnapshot: jdContent },
            error: null
          }),
        });
      });

      const { rerender } = render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        fireEvent.change(textarea, { target: { value: jdContent } });
      });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const patchCall = global.fetch.mock.calls.find(
          call => call[0].includes("/api/applications/app-123") && call[1]?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const payload = JSON.parse(patchCall[1].body);
        expect(payload.jdSnapshot).toBe(jdContent);
      });
    });

    it("should update jdSnapshot to null when cleared", async () => {
      mockApplication.jdSnapshot = "Old JD content";

      global.fetch.mockImplementation((url) => {
        if (url.includes("/timeline")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [], error: null }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            data: { ...mockApplication, jdSnapshot: null },
            error: null
          }),
        });
      });

      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        fireEvent.change(textarea, { target: { value: "" } });
      });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const patchCall = global.fetch.mock.calls.find(
          call => call[0].includes("/api/applications/app-123") && call[1]?.method === "PATCH"
        );
        expect(patchCall).toBeDefined();
        const payload = JSON.parse(patchCall[1].body);
        expect(payload.jdSnapshot).toBeNull();
      });
    });
  });

  describe("Form state sync when application prop changes", () => {
    it("should sync jdSnapshot when application prop updates", async () => {
      const { rerender } = render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        expect(textarea.value).toBe("");
      });

      // Update application prop with new JD
      const updatedApplication = {
        ...mockApplication,
        jdSnapshot: "New JD from server",
      };

      rerender(
        <ApplicationDetail
          application={updatedApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        expect(textarea.value).toBe("New JD from server");
      });
    });

    it("should sync all fields when application prop updates", async () => {
      const { rerender } = render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      // Update application prop
      const updatedApplication = {
        ...mockApplication,
        company: "Updated Company",
        role: "Updated Role",
        location: "Updated Location",
        jdSnapshot: "Updated JD",
      };

      rerender(
        <ApplicationDetail
          application={updatedApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByDisplayValue("Updated Company")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Updated Role")).toBeInTheDocument();
        expect(screen.getByDisplayValue("Updated Location")).toBeInTheDocument();
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        expect(textarea.value).toBe("Updated JD");
      });
    });
  });

  describe("Save error handling preserves JD content (AC2)", () => {
    it("should keep pasted JD text in textarea after save error", async () => {
      const jdContent = "Long job description that user typed";

      global.fetch.mockImplementation((url) => {
        if (url.includes("/timeline")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: [], error: null }),
          });
        }
        // Simulate save error
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({
            data: null,
            error: { code: "SERVER_ERROR", message: "Save failed" }
          }),
        });
      });

      render(
        <ApplicationDetail
          application={mockApplication}
          onUpdate={mockOnUpdate}
          onClose={mockOnClose}
        />
      );

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        fireEvent.change(textarea, { target: { value: jdContent } });
      });

      const saveButton = screen.getByRole("button", { name: /save changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        // Error message should appear
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
        // JD content should still be in textarea (no re-entry required)
        const textarea = screen.getByPlaceholderText(/paste the full job description/i);
        expect(textarea.value).toBe(jdContent);
        // Retry button should be available
        expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
      });
    });
  });
});
