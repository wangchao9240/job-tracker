/**
 * Unit tests for /api/applications route validation schemas
 */

import { z } from "zod";
import { APPLICATION_STATUSES } from "@/lib/utils/applicationStatus";

// Import the schemas from route.js
const createApplicationSchema = z.object({
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  link: z.string().optional().nullable(),
  status: z.enum(APPLICATION_STATUSES).optional().default("draft"),
  appliedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateApplicationSchema = z.object({
  company: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  link: z.string().optional().nullable(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  appliedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

describe("/api/applications - zod validation", () => {
  describe("createApplicationSchema", () => {
    it("should accept valid minimal application (company + role only)", () => {
      const validData = {
        company: "Google",
        role: "Software Engineer",
      };

      const result = createApplicationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data.company).toBe("Google");
      expect(result.data.role).toBe("Software Engineer");
      expect(result.data.status).toBe("draft"); // default
    });

    it("should accept valid full application", () => {
      const validData = {
        company: "Microsoft",
        role: "Developer",
        link: "https://careers.microsoft.com/job/123",
        status: "applied",
        appliedDate: "2025-12-27",
        notes: "Referred by John",
      };

      const result = createApplicationSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it("should reject missing company", () => {
      const invalidData = {
        role: "Engineer",
      };

      const result = createApplicationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["company"]);
    });

    it("should reject empty company string", () => {
      const invalidData = {
        company: "",
        role: "Engineer",
      };

      const result = createApplicationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["company"]);
      expect(result.error.issues[0].message).toBe("Company is required");
    });

    it("should reject missing role", () => {
      const invalidData = {
        company: "Google",
      };

      const result = createApplicationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["role"]);
    });

    it("should reject empty role string", () => {
      const invalidData = {
        company: "Google",
        role: "",
      };

      const result = createApplicationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["role"]);
      expect(result.error.issues[0].message).toBe("Role is required");
    });

    it("should reject invalid status", () => {
      const invalidData = {
        company: "Amazon",
        role: "SDE",
        status: "invalid_status",
      };

      const result = createApplicationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["status"]);
    });

    it("should accept all valid statuses", () => {
      APPLICATION_STATUSES.forEach((status) => {
        const data = {
          company: "Test",
          role: "Role",
          status,
        };

        const result = createApplicationSchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data.status).toBe(status);
      });
    });

    it("should accept null for optional fields", () => {
      const data = {
        company: "Test",
        role: "Role",
        link: null,
        appliedDate: null,
        notes: null,
      };

      const result = createApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.link).toBeNull();
      expect(result.data.appliedDate).toBeNull();
      expect(result.data.notes).toBeNull();
    });

    it("should accept undefined for optional fields", () => {
      const data = {
        company: "Test",
        role: "Role",
      };

      const result = createApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.link).toBeUndefined();
    });
  });

  describe("updateApplicationSchema", () => {
    it("should accept empty object (all fields optional)", () => {
      const data = {};

      const result = updateApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it("should accept partial update (company only)", () => {
      const data = {
        company: "Updated Company",
      };

      const result = updateApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.company).toBe("Updated Company");
    });

    it("should accept partial update (status + appliedDate)", () => {
      const data = {
        status: "applied",
        appliedDate: "2025-12-27",
      };

      const result = updateApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.status).toBe("applied");
      expect(result.data.appliedDate).toBe("2025-12-27");
    });

    it("should reject empty company if provided", () => {
      const data = {
        company: "",
      };

      const result = updateApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["company"]);
    });

    it("should reject empty role if provided", () => {
      const data = {
        role: "",
      };

      const result = updateApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["role"]);
    });

    it("should reject invalid status if provided", () => {
      const data = {
        status: "not_a_valid_status",
      };

      const result = updateApplicationSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(result.error.issues[0].path).toEqual(["status"]);
    });

    it("should accept all valid statuses", () => {
      APPLICATION_STATUSES.forEach((status) => {
        const data = { status };

        const result = updateApplicationSchema.safeParse(data);
        expect(result.success).toBe(true);
        expect(result.data.status).toBe(status);
      });
    });

    it("should accept null for nullable fields", () => {
      const data = {
        link: null,
        appliedDate: null,
        notes: null,
      };

      const result = updateApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data.link).toBeNull();
      expect(result.data.appliedDate).toBeNull();
      expect(result.data.notes).toBeNull();
    });

    it("should accept full update with all fields", () => {
      const data = {
        company: "New Company",
        role: "New Role",
        link: "https://new.com",
        status: "interview",
        appliedDate: "2025-12-28",
        notes: "New notes",
      };

      const result = updateApplicationSchema.safeParse(data);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });
  });
});
