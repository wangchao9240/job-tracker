import { listProjectBullets } from "../projectBulletsRepo.js";

function createMockSupabase({ data = [], error = null } = {}) {
  const builder = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data, error }),
  };

  return builder;
}

describe("projectBulletsRepo search and filter", () => {
  describe("listProjectBullets filter composition", () => {
    it("filters by projectId only", async () => {
      const supabase = createMockSupabase();

      await listProjectBullets({
        supabase,
        userId: "user-123",
        projectId: "project-456",
      });

      expect(supabase.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(supabase.eq).toHaveBeenCalledWith("project_id", "project-456");
      expect(supabase.contains).not.toHaveBeenCalled();
      expect(supabase.or).not.toHaveBeenCalled();
      expect(supabase.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    });

    it("filters by tag only", async () => {
      const supabase = createMockSupabase();

      await listProjectBullets({
        supabase,
        userId: "user-123",
        tag: "frontend",
      });

      expect(supabase.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(supabase.contains).toHaveBeenCalledWith("tags", ["frontend"]);
      expect(supabase.or).not.toHaveBeenCalled();
      expect(supabase.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    });

    it("filters by text search only (quoted to avoid OR-string injection)", async () => {
      const supabase = createMockSupabase();

      await listProjectBullets({
        supabase,
        userId: "user-123",
        q: "performance",
      });

      expect(supabase.eq).toHaveBeenCalledWith("user_id", "user-123");
      expect(supabase.or).toHaveBeenCalledWith(
        'text.ilike."%performance%",title.ilike."%performance%",impact.ilike."%performance%"'
      );
    });

    it("combines tag + text search", async () => {
      const supabase = createMockSupabase();

      await listProjectBullets({
        supabase,
        userId: "user-123",
        tag: "frontend",
        q: "react",
      });

      expect(supabase.contains).toHaveBeenCalledWith("tags", ["frontend"]);
      expect(supabase.or).toHaveBeenCalledWith(
        'text.ilike."%react%",title.ilike."%react%",impact.ilike."%react%"'
      );
    });

    it("does not break when q contains commas", async () => {
      const supabase = createMockSupabase();

      await listProjectBullets({
        supabase,
        userId: "user-123",
        q: "c++, performance",
      });

      expect(supabase.or).toHaveBeenCalledWith(
        'text.ilike."%c++, performance%",title.ilike."%c++, performance%",impact.ilike."%c++, performance%"'
      );
    });
  });
});

