/**
 * Integration tests for POST /api/mapping/propose route
 * Tests { data, error } envelope, auth, and validation
 */

import { NextResponse } from "next/server";
import { POST } from "../route.js";

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
}));

jest.mock("@/lib/server/db/projectBulletsRepo", () => ({
  listProjectBullets: jest.fn(),
}));

jest.mock("@/lib/server/mapping/proposeRuleBased", () => ({
  proposeMapping: jest.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { getApplicationById } from "@/lib/server/db/applicationsRepo";
import { listProjectBullets } from "@/lib/server/db/projectBulletsRepo";
import { proposeMapping } from "@/lib/server/mapping/proposeRuleBased";

function makeJsonRequest(body) {
  return {
    json: jest.fn().mockResolvedValue(body),
  };
}

describe("POST /api/mapping/propose", () => {
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
  });

  describe("Authentication", () => {
    it("should return UNAUTHORIZED when no user session", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      await POST(makeJsonRequest({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }));

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
      expect(getApplicationById).not.toHaveBeenCalled();
      expect(listProjectBullets).not.toHaveBeenCalled();
      expect(proposeMapping).not.toHaveBeenCalled();
    });

    it("should return UNAUTHORIZED when auth error occurs", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Auth failed" },
      });

      await POST(makeJsonRequest({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }));

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "UNAUTHORIZED" } },
        { status: 401 }
      );
    });
  });

  describe("Validation", () => {
    it("should return INVALID_JSON when request body cannot be parsed", async () => {
      const badRequest = { json: jest.fn().mockRejectedValue(new Error("bad json")) };

      await POST(badRequest);

      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
        { status: 400 }
      );
      expect(getApplicationById).not.toHaveBeenCalled();
    });

    it("should return VALIDATION_FAILED when applicationId is not a UUID", async () => {
      await POST(makeJsonRequest({ applicationId: "not-a-uuid" }));

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          data: null,
          error: {
            code: "VALIDATION_FAILED",
            message: "Application ID must be a valid UUID",
            field: "applicationId",
          },
        },
        { status: 400 }
      );
      expect(getApplicationById).not.toHaveBeenCalled();
    });
  });

  describe("Business rules", () => {
    it("should return NOT_FOUND when application is missing or not owned", async () => {
      getApplicationById.mockResolvedValue(null);

      await POST(makeJsonRequest({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }));

      expect(getApplicationById).toHaveBeenCalledWith({
        supabase: mockSupabase,
        userId: mockUser.id,
        id: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(NextResponse.json).toHaveBeenCalledWith(
        { data: null, error: { code: "NOT_FOUND" } },
        { status: 404 }
      );
      expect(listProjectBullets).not.toHaveBeenCalled();
      expect(proposeMapping).not.toHaveBeenCalled();
    });

    it("should return REQUIREMENTS_REQUIRED when extractedRequirements missing", async () => {
      getApplicationById.mockResolvedValue({
        id: "app-1",
        extractedRequirements: null,
      });

      await POST(makeJsonRequest({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }));

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          data: null,
          error: {
            code: "REQUIREMENTS_REQUIRED",
            message: "Application must have extracted requirements before mapping can be proposed",
          },
        },
        { status: 400 }
      );
      expect(listProjectBullets).not.toHaveBeenCalled();
      expect(proposeMapping).not.toHaveBeenCalled();
    });

    it("should return REQUIREMENTS_REQUIRED when both lists are empty", async () => {
      getApplicationById.mockResolvedValue({
        id: "app-1",
        extractedRequirements: { responsibilities: [], requirements: [] },
      });

      await POST(makeJsonRequest({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }));

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          data: null,
          error: {
            code: "REQUIREMENTS_REQUIRED",
            message: "Application must have extracted requirements before mapping can be proposed",
          },
        },
        { status: 400 }
      );
      expect(listProjectBullets).not.toHaveBeenCalled();
      expect(proposeMapping).not.toHaveBeenCalled();
    });

    it("should return BULLETS_REQUIRED when user has no bullets", async () => {
      getApplicationById.mockResolvedValue({
        id: "app-1",
        extractedRequirements: { responsibilities: ["A"], requirements: [] },
      });
      listProjectBullets.mockResolvedValue([]);

      await POST(makeJsonRequest({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }));

      expect(NextResponse.json).toHaveBeenCalledWith(
        {
          data: null,
          error: {
            code: "BULLETS_REQUIRED",
            message: "User must have project bullets before mapping can be proposed",
          },
        },
        { status: 400 }
      );
      expect(proposeMapping).not.toHaveBeenCalled();
    });
  });

  describe("Success", () => {
    it("should return proposal envelope on success", async () => {
      getApplicationById.mockResolvedValue({
        id: "app-1",
        extractedRequirements: {
          responsibilities: ["Build React components"],
          requirements: ["TypeScript experience"],
        },
      });

      const bullets = [
        {
          id: "bullet-1",
          text: "Built React application",
          title: null,
          tags: ["react"],
          impact: null,
        },
      ];
      listProjectBullets.mockResolvedValue(bullets);

      const proposal = [
        {
          itemKey: "responsibility-0",
          kind: "responsibility",
          text: "Build React components",
          suggestedBulletIds: ["bullet-1"],
          scoreByBulletId: { "bullet-1": 4 },
        },
      ];

      proposeMapping.mockReturnValue(proposal);

      await POST(makeJsonRequest({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }));

      expect(proposeMapping).toHaveBeenCalledWith({
        items: [
          { kind: "responsibility", text: "Build React components" },
          { kind: "requirement", text: "TypeScript experience" },
        ],
        bullets,
      });

      const [[payload, init]] = NextResponse.json.mock.calls;
      expect(init).toEqual({ status: 200 });
      expect(payload.error).toBeNull();
      expect(payload.data.proposal).toEqual(proposal);
      expect(payload.data.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});

