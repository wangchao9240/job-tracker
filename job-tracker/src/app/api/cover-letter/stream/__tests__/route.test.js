/**
 * @jest-environment node
 */

import { POST } from "../route";
import { createClient } from "@/lib/supabase/server";
import { getApplicationById } from "@/lib/server/db/applicationsRepo";
import { listProjectBulletsByIds } from "@/lib/server/db/projectBulletsRepo";
import { createDraftVersion, createPreviewVersion } from "@/lib/server/db/coverLetterVersionsRepo";

jest.mock("@/lib/supabase/server");
jest.mock("@/lib/server/db/applicationsRepo");
jest.mock("@/lib/server/db/projectBulletsRepo");
jest.mock("@/lib/server/db/coverLetterVersionsRepo");

function makeStream(chunks) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

async function readStreamToString(stream) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

describe("POST /api/cover-letter/stream", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JOB_OPENAI_BASE_URL = "https://example.invalid/v1";
    process.env.JOB_OPENAI_API_KEY = "test-key";
  });

  test("returns 401 when unauthenticated", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    });

    const req = new Request("http://localhost/api/cover-letter/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  test("returns 400 when JD snapshot missing", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
      },
    });
    getApplicationById.mockResolvedValue({
      id: "app-123",
      userId: "user-123",
      company: "Test Co",
      role: "Engineer",
      jdSnapshot: null,
    });

    const req = new Request("http://localhost/api/cover-letter/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: "123e4567-e89b-12d3-a456-426614174000" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("JD_SNAPSHOT_REQUIRED");
  });

  test("returns 400 when confirmedMapping missing in grounded mode", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
      },
    });
    getApplicationById.mockResolvedValue({
      id: "app-123",
      userId: "user-123",
      company: "Test Co",
      role: "Engineer",
      jdSnapshot: "JD text",
      confirmedMapping: null,
    });

    const req = new Request("http://localhost/api/cover-letter/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
        mode: "grounded",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("CONFIRMED_MAPPING_REQUIRED");
  });

  test("streams delta then done and persists draft on success (grounded)", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
      },
    });

    getApplicationById.mockResolvedValue({
      id: "app-123",
      userId: "user-123",
      company: "Test Co",
      role: "Engineer",
      jdSnapshot: "JD text",
      confirmedMapping: {
        version: 1,
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: [
          {
            itemKey: "requirement-0",
            kind: "requirement",
            text: "Build X",
            bulletIds: ["b-1"],
            uncovered: false,
          },
        ],
      },
    });

    listProjectBulletsByIds.mockResolvedValue([
      { id: "b-1", title: "Bullet", text: "Did a thing", tags: null, impact: null },
    ]);

    global.fetch = jest.fn(async () => {
      const aiSse = makeStream([
        'data: {"choices":[{"delta":{"content":"Hello "}}]}\n',
        'data: {"choices":[{"delta":{"content":"world"}}]}\n',
        "data: [DONE]\n",
      ]);
      return new Response(aiSse, { status: 200 });
    });

    createDraftVersion.mockResolvedValue({
      data: {
        id: "draft-id-1",
        kind: "draft",
      },
      error: null,
    });

    const req = new Request("http://localhost/api/cover-letter/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
        mode: "grounded",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/event-stream/);

    const sseText = await readStreamToString(res.body);
    expect(sseText).toContain("event: delta");
    expect(sseText).toContain("event: done");
    expect(sseText).toContain('"draftId":"draft-id-1"');

    expect(createDraftVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        content: "Hello world",
      })
    );
  });

  test("preview mode does not require confirmedMapping and persists preview", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: "user-123" } }, error: null }),
      },
    });

    getApplicationById.mockResolvedValue({
      id: "app-123",
      userId: "user-123",
      company: "Test Co",
      role: "Engineer",
      jdSnapshot: "JD text",
      confirmedMapping: null,
    });

    listProjectBulletsByIds.mockResolvedValue([]);

    global.fetch = jest.fn(async () => {
      const aiSse = makeStream(['data: {"choices":[{"delta":{"content":"Preview"}}]}\n', "data: [DONE]\n"]);
      return new Response(aiSse, { status: 200 });
    });

    createPreviewVersion.mockResolvedValue({
      data: {
        id: "preview-id-1",
        kind: "preview",
      },
      error: null,
    });

    const req = new Request("http://localhost/api/cover-letter/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId: "123e4567-e89b-12d3-a456-426614174000",
        mode: "preview",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const sseText = await readStreamToString(res.body);
    expect(sseText).toContain('"draftId":"preview-id-1"');
    expect(createPreviewVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        content: "Preview",
      })
    );
  });
});
