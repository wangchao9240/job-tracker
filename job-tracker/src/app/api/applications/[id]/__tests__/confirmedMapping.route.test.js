/**
 * Integration tests for confirmedMapping in /api/applications/[id]
 * Verifies PATCH accepts confirmedMapping atomically and GET returns it.
 */

import { NextResponse } from "next/server";
import { GET, PATCH } from "../route.js";

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

describe("confirmedMapping - /api/applications/[id]", () => {
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

  it("PATCH accepts valid confirmedMapping and GET returns it", async () => {
    const appId = "123e4567-e89b-12d3-a456-426614174000";

    const existingApp = {
      id: appId,
      userId: mockUser.id,
      status: "draft",
      appliedDate: null,
      extractedRequirements: { responsibilities: ["A"], requirements: ["B"] },
      confirmedMapping: null,
    };

    const confirmedMapping = {
      version: 1,
      confirmedAt: "2025-12-28T10:00:00.000Z",
      items: [
        {
          itemKey: "responsibility-0",
          kind: "responsibility",
          text: "A",
          bulletIds: [],
          uncovered: true,
        },
      ],
    };

    const updatedApp = { ...existingApp, confirmedMapping };

    getApplicationById.mockResolvedValueOnce(existingApp);
    updateApplication.mockResolvedValueOnce(updatedApp);
    getApplicationById.mockResolvedValueOnce(updatedApp);

    await PATCH(
      { json: jest.fn().mockResolvedValue({ confirmedMapping }) },
      { params: Promise.resolve({ id: appId }) }
    );

    expect(updateApplication).toHaveBeenCalledWith({
      supabase: mockSupabase,
      userId: mockUser.id,
      id: appId,
      patch: { confirmedMapping },
    });

    await GET({}, { params: Promise.resolve({ id: appId }) });

    const lastCall = NextResponse.json.mock.calls[NextResponse.json.mock.calls.length - 1];
    expect(lastCall[1]).toEqual({ status: 200 });
    expect(lastCall[0].error).toBeNull();
    expect(lastCall[0].data.confirmedMapping).toEqual(confirmedMapping);
  });

  it("PATCH rejects invalid confirmedMapping without partial write", async () => {
    const appId = "123e4567-e89b-12d3-a456-426614174000";

    const existingApp = {
      id: appId,
      userId: mockUser.id,
      status: "draft",
      appliedDate: null,
    };

    getApplicationById.mockResolvedValueOnce(existingApp);

    const invalidConfirmedMapping = {
      version: 2,
      confirmedAt: "2025-12-28T10:00:00.000Z",
      items: [],
    };

    await PATCH(
      { json: jest.fn().mockResolvedValue({ confirmedMapping: invalidConfirmedMapping }) },
      { params: Promise.resolve({ id: appId }) }
    );

    expect(updateApplication).not.toHaveBeenCalled();
    expect(insertStatusEvents).not.toHaveBeenCalled();

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: null, error: { code: "VALIDATION_FAILED", details: expect.any(Object) } }),
      { status: 400 }
    );
  });
});

