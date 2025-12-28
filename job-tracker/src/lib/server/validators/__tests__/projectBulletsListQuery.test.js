import { parseProjectBulletsListQuery } from "../projectBulletsListQuery.js";

describe("projectBulletsListQuery", () => {
  it("trims and lowercases tag", () => {
    const params = new URLSearchParams({ tag: "  React  " });
    const parsed = parseProjectBulletsListQuery(params);
    expect(parsed.success).toBe(true);
    expect(parsed.data.tag).toBe("react");
  });

  it("treats empty strings as undefined", () => {
    const params = new URLSearchParams({ tag: "   ", q: "", projectId: "" });
    const parsed = parseProjectBulletsListQuery(params);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({});
  });

  it("rejects invalid projectId", () => {
    const params = new URLSearchParams({ projectId: "not-a-uuid" });
    const parsed = parseProjectBulletsListQuery(params);
    expect(parsed.success).toBe(false);
  });

  it("rejects overly-long tag", () => {
    const params = new URLSearchParams({ tag: "a".repeat(31) });
    const parsed = parseProjectBulletsListQuery(params);
    expect(parsed.success).toBe(false);
  });

  it("rejects overly-long q", () => {
    const params = new URLSearchParams({ q: "a".repeat(201) });
    const parsed = parseProjectBulletsListQuery(params);
    expect(parsed.success).toBe(false);
  });
});

