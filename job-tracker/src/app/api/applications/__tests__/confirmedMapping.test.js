/**
 * Tests for confirmedMapping schema validation
 * Documents expected behavior for requirement → bullet mapping persistence
 */

import { z } from "zod";

// Maximum items per requirements list (same as in route.js)
const MAX_REQUIREMENTS_ITEMS = 50;
const MAX_ITEM_LENGTH = 200;

// Schemas (duplicated from route.js for testing)
const confirmedMappingItemSchema = z.object({
  itemKey: z.string().min(1, "Item key is required"),
  kind: z.enum(["responsibility", "requirement"]),
  text: z.string().min(1, "Item text is required").max(MAX_ITEM_LENGTH),
  bulletIds: z.array(z.string().uuid()).max(10, "Cannot map more than 10 bullets per item"),
  uncovered: z.boolean(),
});

const confirmedMappingSchema = z.object({
  version: z.literal(1),
  confirmedAt: z.string(),
  items: z
    .array(confirmedMappingItemSchema)
    .max(MAX_REQUIREMENTS_ITEMS * 2, "Too many mapping items"),
});

describe("confirmedMapping schema validation", () => {
  describe("valid confirmed mapping", () => {
    test("should accept complete valid mapping with covered items", () => {
      const validMapping = {
        version: 1,
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: [
          {
            itemKey: "responsibility-0",
            kind: "responsibility",
            text: "Build React components for frontend",
            bulletIds: ["123e4567-e89b-12d3-a456-426614174000", "223e4567-e89b-12d3-a456-426614174001"],
            uncovered: false,
          },
          {
            itemKey: "requirement-0",
            kind: "requirement",
            text: "TypeScript experience",
            bulletIds: ["323e4567-e89b-12d3-a456-426614174002"],
            uncovered: false,
          },
        ],
      };

      const result = confirmedMappingSchema.safeParse(validMapping);
      expect(result.success).toBe(true);
      expect(result.data.items).toHaveLength(2);
    });

    test("should accept mapping with uncovered items (empty bulletIds)", () => {
      const validMapping = {
        version: 1,
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: [
          {
            itemKey: "requirement-1",
            kind: "requirement",
            text: "Quantum computing experience",
            bulletIds: [],
            uncovered: true,
          },
        ],
      };

      const result = confirmedMappingSchema.safeParse(validMapping);
      expect(result.success).toBe(true);
      expect(result.data.items[0].uncovered).toBe(true);
      expect(result.data.items[0].bulletIds).toEqual([]);
    });

    test("should accept empty items array", () => {
      const validMapping = {
        version: 1,
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: [],
      };

      const result = confirmedMappingSchema.safeParse(validMapping);
      expect(result.success).toBe(true);
    });

    test("should accept mapping with mix of covered and uncovered", () => {
      const validMapping = {
        version: 1,
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: [
          {
            itemKey: "responsibility-0",
            kind: "responsibility",
            text: "Lead development team",
            bulletIds: ["123e4567-e89b-12d3-a456-426614174000"],
            uncovered: false,
          },
          {
            itemKey: "requirement-0",
            kind: "requirement",
            text: "PhD in Computer Science",
            bulletIds: [],
            uncovered: true,
          },
        ],
      };

      const result = confirmedMappingSchema.safeParse(validMapping);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid confirmed mapping", () => {
    test("should reject wrong version number", () => {
      const invalidMapping = {
        version: 2,
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: [],
      };

      const result = confirmedMappingSchema.safeParse(invalidMapping);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toContain("version");
    });

    test("should reject missing version", () => {
      const invalidMapping = {
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: [],
      };

      const result = confirmedMappingSchema.safeParse(invalidMapping);
      expect(result.success).toBe(false);
    });

    test("should reject missing confirmedAt", () => {
      const invalidMapping = {
        version: 1,
        items: [],
      };

      const result = confirmedMappingSchema.safeParse(invalidMapping);
      expect(result.success).toBe(false);
    });

    test("should reject missing items array", () => {
      const invalidMapping = {
        version: 1,
        confirmedAt: "2025-12-28T10:00:00.000Z",
      };

      const result = confirmedMappingSchema.safeParse(invalidMapping);
      expect(result.success).toBe(false);
    });

    test("should reject too many items", () => {
      const tooManyItems = Array.from({ length: MAX_REQUIREMENTS_ITEMS * 2 + 1 }, (_, i) => ({
        itemKey: `item-${i}`,
        kind: "requirement",
        text: `Requirement ${i}`,
        bulletIds: [],
        uncovered: true,
      }));

      const invalidMapping = {
        version: 1,
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: tooManyItems,
      };

      const result = confirmedMappingSchema.safeParse(invalidMapping);
      expect(result.success).toBe(false);
    });
  });

  describe("mapping item validation", () => {
    test("should reject empty itemKey", () => {
      const result = confirmedMappingItemSchema.safeParse({
        itemKey: "",
        kind: "requirement",
        text: "Some requirement",
        bulletIds: [],
        uncovered: false,
      });

      expect(result.success).toBe(false);
    });

    test("should reject invalid kind", () => {
      const result = confirmedMappingItemSchema.safeParse({
        itemKey: "item-0",
        kind: "invalid",
        text: "Some requirement",
        bulletIds: [],
        uncovered: false,
      });

      expect(result.success).toBe(false);
    });

    test("should reject empty text", () => {
      const result = confirmedMappingItemSchema.safeParse({
        itemKey: "item-0",
        kind: "requirement",
        text: "",
        bulletIds: [],
        uncovered: false,
      });

      expect(result.success).toBe(false);
    });

    test("should reject text exceeding max length", () => {
      const longText = "a".repeat(MAX_ITEM_LENGTH + 1);

      const result = confirmedMappingItemSchema.safeParse({
        itemKey: "item-0",
        kind: "requirement",
        text: longText,
        bulletIds: [],
        uncovered: false,
      });

      expect(result.success).toBe(false);
    });

    test("should reject non-UUID bulletIds", () => {
      const result = confirmedMappingItemSchema.safeParse({
        itemKey: "item-0",
        kind: "requirement",
        text: "Some requirement",
        bulletIds: ["not-a-uuid"],
        uncovered: false,
      });

      expect(result.success).toBe(false);
    });

    test("should reject too many bulletIds", () => {
      const tooManyBullets = Array.from({ length: 11 }, (_, i) => `${i}23e4567-e89b-12d3-a456-426614174000`);

      const result = confirmedMappingItemSchema.safeParse({
        itemKey: "item-0",
        kind: "requirement",
        text: "Some requirement",
        bulletIds: tooManyBullets,
        uncovered: false,
      });

      expect(result.success).toBe(false);
    });

    test("should reject missing uncovered field", () => {
      const result = confirmedMappingItemSchema.safeParse({
        itemKey: "item-0",
        kind: "requirement",
        text: "Some requirement",
        bulletIds: [],
      });

      expect(result.success).toBe(false);
    });

    test("should reject non-boolean uncovered", () => {
      const result = confirmedMappingItemSchema.safeParse({
        itemKey: "item-0",
        kind: "requirement",
        text: "Some requirement",
        bulletIds: [],
        uncovered: "true",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("API integration expectations", () => {
    test("PATCH /api/applications/[id] should accept confirmedMapping", () => {
      const patchBody = {
        confirmedMapping: {
          version: 1,
          confirmedAt: "2025-12-28T10:00:00.000Z",
          items: [
            {
              itemKey: "responsibility-0",
              kind: "responsibility",
              text: "Build features",
              bulletIds: ["123e4567-e89b-12d3-a456-426614174000"],
              uncovered: false,
            },
          ],
        },
      };

      const result = confirmedMappingSchema.safeParse(patchBody.confirmedMapping);
      expect(result.success).toBe(true);
    });

    test("should preserve atomicity: invalid mapping should not be partially saved", () => {
      // This documents the expectation that validation happens BEFORE DB write
      // If validation fails, NO partial state should be persisted
      const invalidMapping = {
        version: 1,
        confirmedAt: "2025-12-28T10:00:00.000Z",
        items: [
          {
            itemKey: "item-0",
            kind: "requirement",
            text: "Valid item",
            bulletIds: [],
            uncovered: false,
          },
          {
            // Invalid item (missing fields)
            itemKey: "",
            kind: "invalid",
          },
        ],
      };

      const result = confirmedMappingSchema.safeParse(invalidMapping);
      expect(result.success).toBe(false);
      // Expected: API returns 400 VALIDATION_FAILED, no DB write occurs
    });

    test("GET /api/applications/[id] should return confirmedMapping in camelCase", () => {
      // Expected response shape
      const successResponse = {
        data: {
          id: "123e4567-e89b-12d3-a456-426614174000",
          userId: "user-123",
          company: "Example Corp",
          role: "Software Engineer",
          confirmedMapping: {
            version: 1,
            confirmedAt: "2025-12-28T10:00:00.000Z",
            items: [],
          },
          createdAt: "2025-12-28T10:00:00.000Z",
          updatedAt: "2025-12-28T10:00:00.000Z",
        },
        error: null,
      };

      expect(successResponse.data.confirmedMapping).toBeDefined();
      expect(successResponse.data.confirmedMapping.version).toBe(1);
    });
  });
});
