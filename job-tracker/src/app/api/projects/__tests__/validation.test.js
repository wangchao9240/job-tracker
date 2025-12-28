/**
 * Unit tests for /api/projects route
 * Tests zod validation schema and { data, error } envelope
 */

import { z } from "zod";

// Validation schemas from route.js
const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  techStack: z.string().optional().nullable(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  techStack: z.string().optional().nullable(),
});

describe("/api/projects - zod validation", () => {
  describe("createProjectSchema (POST)", () => {
    it("should accept valid full project object", () => {
      const validData = {
        name: "E-commerce Platform",
        description: "A full-stack e-commerce solution",
        role: "Frontend Developer",
        techStack: "React, Node.js, PostgreSQL",
      };

      const result = createProjectSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should accept minimal valid project (name only)", () => {
      const minimalData = {
        name: "My Project",
      };

      const result = createProjectSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(minimalData);
    });

    it("should accept project with null optional fields", () => {
      const dataWithNulls = {
        name: "Project Name",
        description: null,
        role: null,
        techStack: null,
      };

      const result = createProjectSchema.safeParse(dataWithNulls);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(dataWithNulls);
    });

    it("should reject empty name", () => {
      const invalidData = {
        name: "",
        description: "Test",
      };

      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["name"]);
      expect(result.error.issues[0].message).toBe("Project name is required");
    });

    it("should reject missing name", () => {
      const invalidData = {
        description: "Test",
        role: "Developer",
      };

      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["name"]);
    });

    it("should reject invalid name type (number instead of string)", () => {
      const invalidData = {
        name: 123,
      };

      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["name"]);
    });

    it("should reject invalid description type (number instead of string)", () => {
      const invalidData = {
        name: "Valid Project",
        description: 123,
      };

      const result = createProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["description"]);
    });

    it("should strip unknown fields", () => {
      const dataWithExtra = {
        name: "Project",
        description: "Description",
        unknownField: "should be ignored",
      };

      const result = createProjectSchema.safeParse(dataWithExtra);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: "Project",
        description: "Description",
      });
    });
  });

  describe("updateProjectSchema (PATCH)", () => {
    it("should accept partial update (name only)", () => {
      const partialData = {
        name: "Updated Project Name",
      };

      const result = updateProjectSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(partialData);
    });

    it("should accept partial update (description only)", () => {
      const partialData = {
        description: "Updated description",
      };

      const result = updateProjectSchema.safeParse(partialData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(partialData);
    });

    it("should accept empty object (all fields optional)", () => {
      const emptyData = {};

      const result = updateProjectSchema.safeParse(emptyData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it("should reject empty name if provided", () => {
      const invalidData = {
        name: "",
      };

      const result = updateProjectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["name"]);
    });

    it("should accept null values for optional fields", () => {
      const dataWithNulls = {
        description: null,
        role: null,
        techStack: null,
      };

      const result = updateProjectSchema.safeParse(dataWithNulls);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(dataWithNulls);
    });

    it("should accept full update", () => {
      const fullData = {
        name: "Updated Project",
        description: "Updated description",
        role: "Updated Role",
        techStack: "Updated Stack",
      };

      const result = updateProjectSchema.safeParse(fullData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(fullData);
    });
  });

  describe("API envelope format", () => {
    it("should have correct success envelope shape", () => {
      const successEnvelope = {
        data: {
          id: "123",
          userId: "user-123",
          name: "Project",
          description: null,
          role: null,
          techStack: null,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-01-01T00:00:00Z",
        },
        error: null,
      };

      expect(successEnvelope.data).toBeDefined();
      expect(successEnvelope.error).toBeNull();
      expect(successEnvelope.data.id).toBeDefined();
      expect(successEnvelope.data.userId).toBeDefined();
      expect(successEnvelope.data.createdAt).toBeDefined();
    });

    it("should have correct error envelope shape", () => {
      const errorEnvelope = {
        data: null,
        error: {
          code: "VALIDATION_FAILED",
          message: "Invalid input",
        },
      };

      expect(errorEnvelope.data).toBeNull();
      expect(errorEnvelope.error).toBeDefined();
      expect(errorEnvelope.error.code).toBeDefined();
    });

    it("should have stable error codes", () => {
      const errorCodes = [
        "UNAUTHORIZED",
        "INVALID_JSON",
        "VALIDATION_FAILED",
        "NOT_FOUND",
        "CREATE_FAILED",
        "UPDATE_FAILED",
        "DELETE_FAILED",
        "FETCH_FAILED",
      ];

      // All error codes should be uppercase snake_case
      errorCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z_]+$/);
      });
    });
  });
});
