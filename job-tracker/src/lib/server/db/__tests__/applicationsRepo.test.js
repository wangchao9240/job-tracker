/**
 * Unit tests for applicationsRepo
 * Tests snake_case ↔ camelCase mapping and repository methods
 */

import {
  createApplication,
  getApplicationById,
  listApplications,
  updateApplication,
  findDuplicates,
} from "../applicationsRepo.js";

describe("applicationsRepo", () => {
  describe("createApplication", () => {
    it("should convert camelCase input to snake_case for DB", async () => {
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Google",
        role: "Software Engineer",
        link: "https://example.com",
        status: "draft",
        applied_date: null,
        notes: "Test notes",
        jd_snapshot: null,
        extracted_requirements: null,
        confirmed_mapping: null,
        created_at: "2025-12-27T00:00:00Z",
        updated_at: "2025-12-27T01:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await createApplication({
        supabase: mockSupabase,
        userId: "user-id",
        values: {
          company: "Google",
          role: "Software Engineer",
          link: "https://example.com",
          status: "draft",
          notes: "Test notes",
        },
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: "user-id",
        company: "Google",
        role: "Software Engineer",
        link: "https://example.com",
        status: "draft",
        notes: "Test notes",
      });

      expect(result).toEqual({
        id: "test-id",
        userId: "user-id",
        company: "Google",
        role: "Software Engineer",
        link: "https://example.com",
        status: "draft",
        appliedDate: null,
        notes: "Test notes",
        jdSnapshot: null,
        extractedRequirements: null,
        confirmedMapping: null,
        createdAt: "2025-12-27T00:00:00Z",
        updatedAt: "2025-12-27T01:00:00Z",
      });
    });

    it("should handle appliedDate conversion", async () => {
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Microsoft",
        role: "Developer",
        link: null,
        status: "applied",
        applied_date: "2025-12-27",
        notes: null,
        location: null,
        source: "unknown",
        jd_snapshot: null,
        extracted_requirements: null,
        confirmed_mapping: null,
        created_at: "2025-12-27T00:00:00Z",
        updated_at: "2025-12-27T01:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await createApplication({
        supabase: mockSupabase,
        userId: "user-id",
        values: {
          company: "Microsoft",
          role: "Developer",
          status: "applied",
          appliedDate: "2025-12-27",
        },
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: "user-id",
        company: "Microsoft",
        role: "Developer",
        status: "applied",
        applied_date: "2025-12-27",
      });

      expect(result.appliedDate).toBe("2025-12-27");
    });

    it("should handle location field (camelCase → snake_case)", async () => {
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Atlassian",
        role: "Senior Engineer",
        link: "https://atlassian.com/job",
        status: "draft",
        applied_date: null,
        notes: null,
        location: "Sydney, NSW",
        source: "company",
        jd_snapshot: null,
        extracted_requirements: null,
        confirmed_mapping: null,
        created_at: "2025-12-27T00:00:00Z",
        updated_at: "2025-12-27T01:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await createApplication({
        supabase: mockSupabase,
        userId: "user-id",
        values: {
          company: "Atlassian",
          role: "Senior Engineer",
          link: "https://atlassian.com/job",
          status: "draft",
          location: "Sydney, NSW",
          source: "company",
        },
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: "user-id",
        company: "Atlassian",
        role: "Senior Engineer",
        link: "https://atlassian.com/job",
        status: "draft",
        location: "Sydney, NSW",
        source: "company",
      });

      expect(result.location).toBe("Sydney, NSW");
    });

    it("should throw on database error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Insert failed" },
        }),
      };

      await expect(
        createApplication({
          supabase: mockSupabase,
          userId: "user-id",
          values: { company: "Test", role: "Role" },
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Insert failed" });
    });
  });

  describe("getApplicationById", () => {
    it("should return null when no application found (PGRST116)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const result = await getApplicationById({
        supabase: mockSupabase,
        userId: "user-id",
        id: "non-existent-id",
      });

      expect(result).toBeNull();
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "non-existent-id");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-id");
    });

    it("should convert snake_case DB record to camelCase", async () => {
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Amazon",
        role: "SDE",
        link: "https://amazon.jobs",
        status: "interview",
        applied_date: "2025-12-20",
        notes: "Phone screen scheduled",
        location: "Seattle, WA",
        source: "linkedin",
        jd_snapshot: "Job description here",
        extracted_requirements: { skills: ["Java", "AWS"] },
        confirmed_mapping: { mapping: "data" },
        created_at: "2025-12-20T00:00:00Z",
        updated_at: "2025-12-27T01:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await getApplicationById({
        supabase: mockSupabase,
        userId: "user-id",
        id: "test-id",
      });

      expect(result).toEqual({
        id: "test-id",
        userId: "user-id",
        company: "Amazon",
        role: "SDE",
        link: "https://amazon.jobs",
        status: "interview",
        appliedDate: "2025-12-20",
        notes: "Phone screen scheduled",
        location: "Seattle, WA",
        source: "linkedin",
        jdSnapshot: "Job description here",
        extractedRequirements: { skills: ["Java", "AWS"] },
        confirmedMapping: { mapping: "data" },
        createdAt: "2025-12-20T00:00:00Z",
        updatedAt: "2025-12-27T01:00:00Z",
      });
    });

    it("should throw on non-PGRST116 errors", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Database error" },
        }),
      };

      await expect(
        getApplicationById({
          supabase: mockSupabase,
          userId: "user-id",
          id: "test-id",
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Database error" });
    });
  });

  describe("listApplications", () => {
    it("should return empty array when no applications", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const result = await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
      });

      expect(result).toEqual([]);
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-id");
      expect(mockSupabase.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    });

    it("should convert all records to camelCase", async () => {
      const mockDbRecords = [
        {
          id: "id-1",
          user_id: "user-id",
          company: "Company A",
          role: "Role A",
          link: null,
          status: "draft",
          applied_date: null,
          notes: null,
          jd_snapshot: null,
          extracted_requirements: null,
          confirmed_mapping: null,
          created_at: "2025-12-27T00:00:00Z",
          updated_at: "2025-12-27T02:00:00Z",
        },
        {
          id: "id-2",
          user_id: "user-id",
          company: "Company B",
          role: "Role B",
          link: "https://b.com",
          status: "applied",
          applied_date: "2025-12-26",
          notes: "Note B",
          jd_snapshot: null,
          extracted_requirements: null,
          confirmed_mapping: null,
          created_at: "2025-12-26T00:00:00Z",
          updated_at: "2025-12-27T01:00:00Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockDbRecords,
          error: null,
        }),
      };

      const result = await listApplications({
        supabase: mockSupabase,
        userId: "user-id",
      });

      expect(result).toHaveLength(2);
      expect(result[0].company).toBe("Company A");
      expect(result[0].userId).toBe("user-id");
      expect(result[1].appliedDate).toBe("2025-12-26");
    });

    it("should throw on database error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Query failed" },
        }),
      };

      await expect(
        listApplications({
          supabase: mockSupabase,
          userId: "user-id",
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Query failed" });
    });
  });

  describe("updateApplication", () => {
    it("should return null when application not found (PGRST116)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const result = await updateApplication({
        supabase: mockSupabase,
        userId: "user-id",
        id: "non-existent-id",
        patch: { status: "applied" },
      });

      expect(result).toBeNull();
    });

    it("should convert camelCase patch to snake_case for DB", async () => {
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Updated Company",
        role: "Updated Role",
        link: "https://updated.com",
        status: "applied",
        applied_date: "2025-12-27",
        notes: "Updated notes",
        jd_snapshot: null,
        extracted_requirements: null,
        confirmed_mapping: null,
        created_at: "2025-12-20T00:00:00Z",
        updated_at: "2025-12-27T03:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await updateApplication({
        supabase: mockSupabase,
        userId: "user-id",
        id: "test-id",
        patch: {
          company: "Updated Company",
          role: "Updated Role",
          status: "applied",
          appliedDate: "2025-12-27",
        },
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        company: "Updated Company",
        role: "Updated Role",
        status: "applied",
        applied_date: "2025-12-27",
      });

      expect(result).toEqual({
        id: "test-id",
        userId: "user-id",
        company: "Updated Company",
        role: "Updated Role",
        link: "https://updated.com",
        status: "applied",
        appliedDate: "2025-12-27",
        notes: "Updated notes",
        jdSnapshot: null,
        extractedRequirements: null,
        confirmedMapping: null,
        createdAt: "2025-12-20T00:00:00Z",
        updatedAt: "2025-12-27T03:00:00Z",
      });
    });

    it("should handle partial updates", async () => {
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Original Company",
        role: "Original Role",
        link: null,
        status: "interview",
        applied_date: "2025-12-20",
        notes: "Just updating status",
        location: null,
        source: "unknown",
        jd_snapshot: null,
        extracted_requirements: null,
        confirmed_mapping: null,
        created_at: "2025-12-20T00:00:00Z",
        updated_at: "2025-12-27T04:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      await updateApplication({
        supabase: mockSupabase,
        userId: "user-id",
        id: "test-id",
        patch: { status: "interview" },
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        status: "interview",
      });
    });

    it("should handle location update (camelCase → snake_case)", async () => {
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Canva",
        role: "Designer",
        link: "https://canva.com/careers",
        status: "draft",
        applied_date: null,
        notes: null,
        location: "Melbourne, VIC",
        source: "company",
        jd_snapshot: null,
        extracted_requirements: null,
        confirmed_mapping: null,
        created_at: "2025-12-20T00:00:00Z",
        updated_at: "2025-12-27T05:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await updateApplication({
        supabase: mockSupabase,
        userId: "user-id",
        id: "test-id",
        patch: { location: "Melbourne, VIC" },
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        location: "Melbourne, VIC",
      });

      expect(result.location).toBe("Melbourne, VIC");
    });

    it("should handle jdSnapshot update (camelCase → snake_case)", async () => {
      const jdContent = "Job Description:\n\nWe are looking for a senior engineer with 5+ years experience...";
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Stripe",
        role: "Senior Engineer",
        link: "https://stripe.com/jobs",
        status: "draft",
        applied_date: null,
        notes: null,
        location: "San Francisco, CA",
        source: "company",
        jd_snapshot: jdContent,
        extracted_requirements: null,
        confirmed_mapping: null,
        created_at: "2025-12-20T00:00:00Z",
        updated_at: "2025-12-27T06:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await updateApplication({
        supabase: mockSupabase,
        userId: "user-id",
        id: "test-id",
        patch: { jdSnapshot: jdContent },
      });

      expect(mockSupabase.update).toHaveBeenCalledWith({
        jd_snapshot: jdContent,
      });

      expect(result.jdSnapshot).toBe(jdContent);
    });

    it("should handle jdSnapshot in create operation", async () => {
      const jdContent = "Job Description: Full-stack developer needed for exciting startup...";
      const mockDbRecord = {
        id: "test-id",
        user_id: "user-id",
        company: "Startup Inc",
        role: "Full Stack Developer",
        link: "https://startup.com/jobs",
        status: "draft",
        applied_date: null,
        notes: null,
        location: "Remote",
        source: "company",
        jd_snapshot: jdContent,
        extracted_requirements: null,
        confirmed_mapping: null,
        created_at: "2025-12-27T00:00:00Z",
        updated_at: "2025-12-27T00:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockDbRecord,
          error: null,
        }),
      };

      const result = await createApplication({
        supabase: mockSupabase,
        userId: "user-id",
        values: {
          company: "Startup Inc",
          role: "Full Stack Developer",
          link: "https://startup.com/jobs",
          status: "draft",
          location: "Remote",
          source: "company",
          jdSnapshot: jdContent,
        },
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: "user-id",
        company: "Startup Inc",
        role: "Full Stack Developer",
        link: "https://startup.com/jobs",
        status: "draft",
        location: "Remote",
        source: "company",
        jd_snapshot: jdContent,
      });

      expect(result.jdSnapshot).toBe(jdContent);
    });

    it("should throw on non-PGRST116 errors", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Update failed" },
        }),
      };

      await expect(
        updateApplication({
          supabase: mockSupabase,
          userId: "user-id",
          id: "test-id",
          patch: { status: "applied" },
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Update failed" });
    });
  });

  describe("findDuplicates", () => {
    // Mock normalizeUrl to avoid dynamic imports in tests
    beforeEach(() => {
      jest.mock("../ingestion/normalizeUrl.js", () => ({
        normalizeUrl: jest.fn((url) => {
          if (!url) return null;
          // Simple normalization for testing
          return `https://${url.replace(/^https?:\/\//i, "").toLowerCase()}`;
        }),
        normalizeCompany: jest.fn((company) => {
          if (!company) return null;
          return company.trim().toLowerCase();
        }),
        normalizeRole: jest.fn((role) => {
          if (!role) return null;
          return role.trim().toLowerCase();
        }),
      }));
    });

    afterEach(() => {
      jest.unmock("../ingestion/normalizeUrl.js");
    });

    it("should return empty arrays when no duplicates found", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const result = await findDuplicates({
        supabase: mockSupabase,
        userId: "user-id",
        check: {
          normalizedUrl: "https://example.com/job",
          normalizedCompany: "test company",
          normalizedRole: "test role",
        },
      });

      expect(result).toEqual({
        urlMatches: [],
        companyRoleMatches: [],
      });
    });

    it("should find URL duplicates (strong match)", async () => {
      const mockDbRecords = [
        {
          id: "app-1",
          company: "Example Corp",
          role: "Engineer",
          status: "applied",
          link: "https://example.com/job",
          updated_at: "2025-12-27T00:00:00Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn()
          .mockResolvedValueOnce({
            data: mockDbRecords,
            error: null,
          })
          .mockResolvedValueOnce({
            data: [],
            error: null,
          }),
      };

      const result = await findDuplicates({
        supabase: mockSupabase,
        userId: "user-id",
        check: {
          normalizedUrl: "https://example.com/job",
        },
      });

      expect(result.urlMatches).toHaveLength(1);
      expect(result.urlMatches[0]).toEqual({
        id: "app-1",
        company: "Example Corp",
        role: "Engineer",
        status: "applied",
        link: "https://example.com/job",
        updatedAt: "2025-12-27T00:00:00Z",
      });
    });

    it("should find company+role duplicates (weak match)", async () => {
      const mockDbRecords = [
        {
          id: "app-2",
          company: "Test Company",
          role: "Test Role",
          status: "draft",
          link: "https://different-url.com/job",
          updated_at: "2025-12-26T00:00:00Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn()
          .mockResolvedValueOnce({
            data: [],
            error: null,
          })
          .mockResolvedValueOnce({
            data: mockDbRecords,
            error: null,
          }),
      };

      const result = await findDuplicates({
        supabase: mockSupabase,
        userId: "user-id",
        check: {
          normalizedCompany: "test company",
          normalizedRole: "test role",
        },
      });

      expect(result.companyRoleMatches).toHaveLength(1);
      expect(result.companyRoleMatches[0]).toEqual({
        id: "app-2",
        company: "Test Company",
        role: "Test Role",
        status: "draft",
        link: "https://different-url.com/job",
        updatedAt: "2025-12-26T00:00:00Z",
      });
    });

    it("should find both URL and company+role duplicates", async () => {
      const urlMatches = [
        {
          id: "app-url",
          company: "Company A",
          role: "Role A",
          status: "applied",
          link: "https://example.com/job",
          updated_at: "2025-12-27T01:00:00Z",
        },
      ];

      const companyRoleMatches = [
        {
          id: "app-cr",
          company: "Company B",
          role: "Role B",
          status: "interview",
          link: "https://different.com/job",
          updated_at: "2025-12-27T02:00:00Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn()
          .mockResolvedValueOnce({
            data: urlMatches,
            error: null,
          })
          .mockResolvedValueOnce({
            data: companyRoleMatches,
            error: null,
          }),
      };

      const result = await findDuplicates({
        supabase: mockSupabase,
        userId: "user-id",
        check: {
          normalizedUrl: "https://example.com/job",
          normalizedCompany: "company b",
          normalizedRole: "role b",
        },
      });

      expect(result.urlMatches).toHaveLength(1);
      expect(result.companyRoleMatches).toHaveLength(1);
    });

    it("should scope by user_id (RLS safety)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      await findDuplicates({
        supabase: mockSupabase,
        userId: "user-123",
        check: {
          normalizedUrl: "https://example.com/job",
        },
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-123");
    });

    it("should throw on database error (URL check)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Query failed" },
        }),
      };

      await expect(
        findDuplicates({
          supabase: mockSupabase,
          userId: "user-id",
          check: {
            normalizedUrl: "https://example.com/job",
          },
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Query failed" });
    });

    it("should throw on database error (company+role check)", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn()
          .mockResolvedValueOnce({
            data: [],
            error: null,
          })
          .mockResolvedValue({
            data: null,
            error: { code: "DB_ERROR", message: "Query failed" },
          }),
      };

      await expect(
        findDuplicates({
          supabase: mockSupabase,
          userId: "user-id",
          check: {
            normalizedUrl: "https://example.com/job",
            normalizedCompany: "test",
            normalizedRole: "role",
          },
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Query failed" });
    });

    it("should handle null/missing check parameters", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const result = await findDuplicates({
        supabase: mockSupabase,
        userId: "user-id",
        check: {}, // No normalized values provided
      });

      expect(result).toEqual({
        urlMatches: [],
        companyRoleMatches: [],
      });
    });
  });
});
