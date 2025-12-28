/**
 * Unit tests for PATCH /api/applications/[id]
 * Tests validation of location and jdSnapshot fields added in Story 3-2
 */

import { NextResponse } from "next/server";
import { PATCH } from "../route.js";

// Mock dependencies
jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({ body, status: init?.status || 200 })),
  },
}));

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(),
}));

jest.mock("@/lib/server/db/applicationsRepo", () => ({
  getApplicationById: jest.fn(),
  updateApplication: jest.fn(),
}));

jest.mock("@/lib/server/db/statusEventsRepo", () => ({
  insertStatusEvents: jest.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getApplicationById, updateApplication } from "@/lib/server/db/applicationsRepo";
import { insertStatusEvents } from "@/lib/server/db/statusEventsRepo";

describe("PATCH /api/applications/[id]", () => {
  let mockRequest;
  let mockParams;
  let mockSupabase;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();
    NextResponse.json.mockClear();

    mockUser = { id: "user-123" };
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    };

    createClient.mockResolvedValue(mockSupabase);

    mockParams = Promise.resolve({ id: "app-123" });
  });

  describe("location field validation", () => {
    it("should accept valid location string", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        location: null,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, location: "Sydney, NSW" });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: "Sydney, NSW",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "app-123",
        patch: { location: "Sydney, NSW" },
      });
    });

    it("should accept null location", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        location: "Old Location",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, location: null });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: null,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "app-123",
        patch: { location: null },
      });
    });

    it("should reject location with invalid type (number)", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: 12345,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should reject location with invalid type (object)", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: { city: "Sydney" },
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });
  });

  describe("jdSnapshot field validation", () => {
    it("should accept valid jdSnapshot string", async () => {
      const jdContent = "Job Description:\n\nWe are looking for...";
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        jdSnapshot: null,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, jdSnapshot: jdContent });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: jdContent,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "app-123",
        patch: { jdSnapshot: jdContent },
      });
    });

    it("should accept null jdSnapshot (clearing JD)", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        jdSnapshot: "Old JD content",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, jdSnapshot: null });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: null,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "app-123",
        patch: { jdSnapshot: null },
      });
    });

    it("should accept large jdSnapshot content", async () => {
      const largeJdContent = "A".repeat(50000); // 50K characters
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        jdSnapshot: null,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, jdSnapshot: largeJdContent });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: largeJdContent,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "app-123",
        patch: { jdSnapshot: largeJdContent },
      });
    });

    it("should reject jdSnapshot with invalid type (number)", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: 12345,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should reject jdSnapshot with invalid type (array)", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: ["line1", "line2"],
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });
  });

  describe("combined location and jdSnapshot update", () => {
    it("should accept both location and jdSnapshot together", async () => {
      const jdContent = "Job Description content...";
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        location: null,
        jdSnapshot: null,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({
        ...existingApp,
        location: "Melbourne, VIC",
        jdSnapshot: jdContent,
      });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: "Melbourne, VIC",
          jdSnapshot: jdContent,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        id: "app-123",
        patch: {
          location: "Melbourne, VIC",
          jdSnapshot: jdContent,
        },
      });
    });
  });

  describe("existing field validation still works", () => {
    it("should still validate company field", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "applied",
        appliedDate: "2025-12-27",
      };

      getApplicationById.mockResolvedValue(existingApp);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          company: "", // Empty string should fail validation
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should still validate role field", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "applied",
        appliedDate: "2025-12-27",
      };

      getApplicationById.mockResolvedValue(existingApp);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          role: "", // Empty string should fail validation
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });
  });

  describe("timeline event generation", () => {
    it("should generate field_changed event for location change", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        location: "Old Location",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, location: "New Location" });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: "New Location",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(insertStatusEvents).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        applicationId: "app-123",
        events: [
          {
            eventType: "field_changed",
            payload: {
              field: "location",
              from: "Old Location",
              to: "New Location",
            },
          },
        ],
      });
    });

    it("should generate field_changed event when location changes from null", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        location: null,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, location: "Sydney, NSW" });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: "Sydney, NSW",
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(insertStatusEvents).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        applicationId: "app-123",
        events: [
          {
            eventType: "field_changed",
            payload: {
              field: "location",
              from: null,
              to: "Sydney, NSW",
            },
          },
        ],
      });
    });

    it("should generate jd_snapshot_updated event when adding JD", async () => {
      const jdContent = "Job Description content...";
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        jdSnapshot: null,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, jdSnapshot: jdContent });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: jdContent,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(insertStatusEvents).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        applicationId: "app-123",
        events: [
          {
            eventType: "jd_snapshot_updated",
            payload: {
              fromLength: 0,
              toLength: jdContent.length,
            },
          },
        ],
      });
    });

    it("should generate jd_snapshot_updated event when updating JD", async () => {
      const oldJd = "Old job description";
      const newJd = "New updated job description with more content";
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        jdSnapshot: oldJd,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, jdSnapshot: newJd });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: newJd,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(insertStatusEvents).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        applicationId: "app-123",
        events: [
          {
            eventType: "jd_snapshot_updated",
            payload: {
              fromLength: oldJd.length,
              toLength: newJd.length,
            },
          },
        ],
      });
    });

    it("should generate jd_snapshot_updated event when removing JD", async () => {
      const oldJd = "Old job description to be removed";
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        jdSnapshot: oldJd,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, jdSnapshot: null });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: null,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(insertStatusEvents).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        applicationId: "app-123",
        events: [
          {
            eventType: "jd_snapshot_updated",
            payload: {
              fromLength: oldJd.length,
              toLength: 0,
            },
          },
        ],
      });
    });

    it("should NOT generate event when location unchanged", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        location: "Sydney, NSW",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue(existingApp);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: "Sydney, NSW", // Same value
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(insertStatusEvents).not.toHaveBeenCalled();
    });

    it("should NOT generate event when jdSnapshot unchanged", async () => {
      const jdContent = "Same job description";
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        jdSnapshot: jdContent,
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue(existingApp);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          jdSnapshot: jdContent, // Same value
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(insertStatusEvents).not.toHaveBeenCalled();
    });

    it("should generate multiple events when both location and jdSnapshot change", async () => {
      const newJd = "New JD content";
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        location: "Old Location",
        jdSnapshot: "Old JD",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({
        ...existingApp,
        location: "New Location",
        jdSnapshot: newJd,
      });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          location: "New Location",
          jdSnapshot: newJd,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(insertStatusEvents).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: "user-123",
        applicationId: "app-123",
        events: expect.arrayContaining([
          {
            eventType: "field_changed",
            payload: {
              field: "location",
              from: "Old Location",
              to: "New Location",
            },
          },
          {
            eventType: "jd_snapshot_updated",
            payload: {
              fromLength: "Old JD".length,
              toLength: newJd.length,
            },
          },
        ]),
      });
    });
  });

  describe("extractedRequirements validation", () => {
    it("should accept valid extractedRequirements with all arrays", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        extractedRequirements: null,
      };

      const validReqs = {
        responsibilities: ["Lead team", "Manage projects"],
        requirements: ["5+ years experience", "TypeScript"],
        extractedAt: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, extractedRequirements: validReqs });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: validReqs,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              responsibilities: ["Lead team", "Manage projects"],
              requirements: ["5+ years experience", "TypeScript"],
              extractedAt: "2025-01-01T00:00:00.000Z",
              source: "manual", // First save without existing should be "manual"
            }),
          }),
        })
      );
    });

    it("should reject extractedRequirements with empty string in responsibilities", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: {
            responsibilities: ["Valid item", ""], // Empty string
            requirements: ["Valid requirement"],
          },
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should reject extractedRequirements with item exceeding max length", async () => {
      const longItem = "a".repeat(201); // Exceeds MAX_ITEM_LENGTH (200)

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: {
            responsibilities: [longItem],
            requirements: ["Valid requirement"],
          },
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should reject extractedRequirements with too many responsibilities", async () => {
      const tooManyItems = Array.from({ length: 51 }, (_, i) => `Item ${i + 1}`); // Exceeds MAX_REQUIREMENTS_ITEMS (50)

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: {
            responsibilities: tooManyItems,
            requirements: ["Valid requirement"],
          },
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should reject extractedRequirements with non-array responsibilities", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: {
            responsibilities: "Not an array",
            requirements: ["Valid requirement"],
          },
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should reject extractedRequirements with non-array requirements", async () => {
      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: {
            responsibilities: ["Valid responsibility"],
            requirements: "Not an array",
          },
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(NextResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: "VALIDATION_FAILED",
          }),
        }),
        { status: 400 }
      );
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should set source to 'mixed' when editing AI-extracted requirements", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        extractedRequirements: {
          responsibilities: ["Old resp"],
          requirements: ["Old req"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: {
            responsibilities: ["New resp"],
            requirements: ["New req"],
          },
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              source: "mixed", // AI-extracted now edited = mixed
            }),
          }),
        })
      );
    });

    it("should preserve extractedAt from original extraction", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        extractedRequirements: {
          responsibilities: ["Old resp"],
          requirements: ["Old req"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: {
            responsibilities: ["New resp"],
            requirements: ["New req"],
          },
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              extractedAt: "2025-01-01T00:00:00.000Z", // Preserved
              updatedAt: expect.any(String), // New timestamp
            }),
          }),
        })
      );
    });

    it("should accept null extractedRequirements to clear data", async () => {
      const existingApp = {
        id: "app-123",
        userId: "user-123",
        company: "Test Co",
        role: "Developer",
        status: "draft",
        extractedRequirements: {
          responsibilities: ["Old resp"],
          requirements: ["Old req"],
        },
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, extractedRequirements: null });
      insertStatusEvents.mockResolvedValue(undefined);

      mockRequest = {
        json: jest.fn().mockResolvedValue({
          extractedRequirements: null,
        }),
      };

      await PATCH(mockRequest, { params: mockParams });

      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: null,
          }),
        })
      );
    });
  });

  describe("focus set validation", () => {
    it("should accept valid focusResponsibilities from existing list", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: ["Lead team", "Design systems", "Code reviews"],
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, id: mockUserId });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(200);
      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              focusResponsibilities: ["Lead team", "Design systems"],
            }),
          }),
        })
      );
    });

    it("should filter invalid items from focusResponsibilities", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: ["Lead team", "Code reviews"],
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, id: mockUserId });

      // Request includes valid and invalid items
      mockRequest.json.mockResolvedValue({
        extractedRequirements: {
          focusResponsibilities: ["Lead team", "Invalid item", "Code reviews"],
        },
      });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(200);
      // Should only include valid items
      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              focusResponsibilities: ["Lead team", "Code reviews"],
            }),
          }),
        })
      );
    });

    it("should return error when all focusResponsibilities items are invalid", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: ["Lead team", "Code reviews"],
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);

      // Request has only invalid items
      mockRequest.json.mockResolvedValue({
        extractedRequirements: {
          focusResponsibilities: ["Invalid item 1", "Invalid item 2"],
        },
      });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error.code).toBe("FOCUS_ITEMS_INVALID");
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should accept null to clear focusResponsibilities", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: ["Lead team", "Code reviews"],
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
          focusResponsibilities: ["Lead team"],
          focusSetUpdatedAt: "2025-01-01T00:00:00.000Z",
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, id: mockUserId });

      mockRequest.json.mockResolvedValue({
        extractedRequirements: {
          focusResponsibilities: null,
        },
      });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(200);
      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              focusResponsibilities: null,
            }),
          }),
        })
      );
    });

    it("should update focusSetUpdatedAt when focusResponsibilities changes", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: ["Lead team", "Code reviews"],
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, id: mockUserId });

      mockRequest.json.mockResolvedValue({
        extractedRequirements: {
          focusResponsibilities: ["Lead team"],
        },
      });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(200);
      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              focusResponsibilities: ["Lead team"],
              focusSetUpdatedAt: expect.any(String),
            }),
          }),
        })
      );
    });

    it("should accept focusDismissed flag", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: ["Lead team"],
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
          quality: { isLowSignal: true, reasons: ["too_many_items"] },
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, id: mockUserId });

      mockRequest.json.mockResolvedValue({
        extractedRequirements: {
          focusDismissed: true,
        },
      });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(200);
      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              focusDismissed: true,
            }),
          }),
        })
      );
    });

    it("should accept quality metadata", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: ["Lead team"],
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);
      updateApplication.mockResolvedValue({ ...existingApp, id: mockUserId });

      mockRequest.json.mockResolvedValue({
        extractedRequirements: {
          quality: {
            isLowSignal: true,
            reasons: ["too_long", "repetitive"],
          },
        },
      });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(200);
      expect(updateApplication).toHaveBeenCalledWith(
        expect.objectContaining({
          patch: expect.objectContaining({
            extractedRequirements: expect.objectContaining({
              quality: {
                isLowSignal: true,
                reasons: ["too_long", "repetitive"],
              },
            }),
          }),
        })
      );
    });

    it("should reject focusResponsibilities exceeding max items", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: Array.from({ length: 60 }, (_, i) => `Task ${i + 1}`),
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);

      // Attempt to set 51 items (exceeds MAX_REQUIREMENTS_ITEMS = 50)
      const tooManyItems = Array.from({ length: 51 }, (_, i) => `Task ${i + 1}`);
      mockRequest.json.mockResolvedValue({
        extractedRequirements: {
          focusResponsibilities: tooManyItems,
        },
      });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error.code).toBe("VALIDATION_FAILED");
      expect(updateApplication).not.toHaveBeenCalled();
    });

    it("should reject focusResponsibilities with empty strings", async () => {
      const existingApp = {
        id: mockUserId,
        user_id: mockUserId,
        company: "Test Co",
        role: "Developer",
        status: "applied",
        extracted_requirements: {
          responsibilities: ["Lead team", "Code reviews"],
          requirements: ["5+ years"],
          extractedAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-01T00:00:00.000Z",
          source: "ai",
        },
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
      };

      getApplicationById.mockResolvedValue(existingApp);

      mockRequest.json.mockResolvedValue({
        extractedRequirements: {
          focusResponsibilities: ["Lead team", "", "Code reviews"],
        },
      });

      const response = await PATCH(mockRequest, {
        params: Promise.resolve({ id: mockUserId }),
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error.code).toBe("VALIDATION_FAILED");
      expect(updateApplication).not.toHaveBeenCalled();
    });
  });
});
