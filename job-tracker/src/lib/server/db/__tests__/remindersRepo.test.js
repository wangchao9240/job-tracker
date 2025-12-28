/**
 * Unit tests for remindersRepo
 * Tests reminder creation, retrieval, and dismissal functions
 */

import {
  upsertNoResponseReminder,
  listActiveRemindersForUser,
  getReminderById,
  dismissReminder,
  getActiveReminderByApplicationAndType,
} from "../remindersRepo.js";

describe("remindersRepo", () => {
  describe("upsertNoResponseReminder", () => {
    it("should insert a new reminder", async () => {
      const mockData = {
        id: "reminder-1",
        application_id: "app-1",
        user_id: "user-1",
        type: "no_response_follow_up",
        due_at: "2025-12-27T12:00:00Z",
        dismissed_at: null,
        created_at: "2025-12-27T11:00:00Z",
        updated_at: "2025-12-27T11:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await upsertNoResponseReminder({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
        dueAt: "2025-12-27T12:00:00Z",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("reminders");
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          application_id: "app-1",
          user_id: "user-1",
          type: "no_response_follow_up",
          due_at: "2025-12-27T12:00:00Z",
        }),
        {
          onConflict: "application_id,type",
          ignoreDuplicates: false,
        }
      );
      expect(result.type).toBe("no_response_follow_up");
      expect(result.applicationId).toBe("app-1");
    });

    it("should update existing reminder (idempotent)", async () => {
      const mockData = {
        id: "reminder-1",
        application_id: "app-1",
        user_id: "user-1",
        type: "no_response_follow_up",
        due_at: "2025-12-28T12:00:00Z",
        dismissed_at: null,
        created_at: "2025-12-27T11:00:00Z",
        updated_at: "2025-12-28T11:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await upsertNoResponseReminder({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
        dueAt: "2025-12-28T12:00:00Z",
      });

      expect(result.dueAt).toBe("2025-12-28T12:00:00Z");
      expect(result.updatedAt).toBe("2025-12-28T11:00:00Z");
    });

    it("should throw on insert error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "INSERT_ERROR", message: "Insert failed" },
        }),
      };

      await expect(
        upsertNoResponseReminder({
          supabase: mockSupabase,
          userId: "user-1",
          applicationId: "app-1",
          dueAt: "2025-12-27T12:00:00Z",
        })
      ).rejects.toEqual({ code: "INSERT_ERROR", message: "Insert failed" });
    });
  });

  describe("listActiveRemindersForUser", () => {
    it("should list active reminders (not dismissed, due)", async () => {
      const mockData = [
        {
          id: "reminder-1",
          application_id: "app-1",
          user_id: "user-1",
          type: "no_response_follow_up",
          due_at: "2025-12-20T12:00:00Z",
          dismissed_at: null,
          created_at: "2025-12-20T11:00:00Z",
          updated_at: "2025-12-20T11:00:00Z",
        },
        {
          id: "reminder-2",
          application_id: "app-2",
          user_id: "user-1",
          type: "no_response_follow_up",
          due_at: "2025-12-25T12:00:00Z",
          dismissed_at: null,
          created_at: "2025-12-25T11:00:00Z",
          updated_at: "2025-12-25T11:00:00Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await listActiveRemindersForUser({
        supabase: mockSupabase,
        userId: "user-1",
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(mockSupabase.is).toHaveBeenCalledWith("dismissed_at", null);
      expect(mockSupabase.lte).toHaveBeenCalledWith("due_at", expect.any(String));
      expect(mockSupabase.order).toHaveBeenCalledWith("due_at", { ascending: true });
      expect(result).toHaveLength(2);
      expect(result[0].dismissedAt).toBeNull();
    });

    it("should return empty array when no active reminders", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const result = await listActiveRemindersForUser({
        supabase: mockSupabase,
        userId: "user-1",
      });

      expect(result).toEqual([]);
    });

    it("should exclude dismissed reminders", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      await listActiveRemindersForUser({
        supabase: mockSupabase,
        userId: "user-1",
      });

      expect(mockSupabase.is).toHaveBeenCalledWith("dismissed_at", null);
    });

    it("should throw on database error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Query failed" },
        }),
      };

      await expect(
        listActiveRemindersForUser({
          supabase: mockSupabase,
          userId: "user-1",
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Query failed" });
    });
  });

  describe("getReminderById", () => {
    it("should get reminder by ID", async () => {
      const mockData = {
        id: "reminder-1",
        application_id: "app-1",
        user_id: "user-1",
        type: "no_response_follow_up",
        due_at: "2025-12-27T12:00:00Z",
        dismissed_at: null,
        created_at: "2025-12-27T11:00:00Z",
        updated_at: "2025-12-27T11:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await getReminderById({
        supabase: mockSupabase,
        userId: "user-1",
        id: "reminder-1",
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "reminder-1");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(result.id).toBe("reminder-1");
    });

    it("should return null when reminder not found", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const result = await getReminderById({
        supabase: mockSupabase,
        userId: "user-1",
        id: "nonexistent",
      });

      expect(result).toBeNull();
    });

    it("should throw on other database errors", async () => {
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
        getReminderById({
          supabase: mockSupabase,
          userId: "user-1",
          id: "reminder-1",
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Database error" });
    });
  });

  describe("dismissReminder", () => {
    it("should dismiss a reminder", async () => {
      const mockData = {
        id: "reminder-1",
        application_id: "app-1",
        user_id: "user-1",
        type: "no_response_follow_up",
        due_at: "2025-12-27T12:00:00Z",
        dismissed_at: "2025-12-27T13:00:00Z",
        created_at: "2025-12-27T11:00:00Z",
        updated_at: "2025-12-27T13:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await dismissReminder({
        supabase: mockSupabase,
        userId: "user-1",
        id: "reminder-1",
      });

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          dismissed_at: expect.any(String),
          updated_at: expect.any(String),
        })
      );
      expect(mockSupabase.eq).toHaveBeenCalledWith("id", "reminder-1");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(result.dismissedAt).toBe("2025-12-27T13:00:00Z");
    });

    it("should return null when reminder not found", async () => {
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

      const result = await dismissReminder({
        supabase: mockSupabase,
        userId: "user-1",
        id: "nonexistent",
      });

      expect(result).toBeNull();
    });

    it("should throw on other database errors", async () => {
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
        dismissReminder({
          supabase: mockSupabase,
          userId: "user-1",
          id: "reminder-1",
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Update failed" });
    });
  });

  describe("getActiveReminderByApplicationAndType", () => {
    it("should get active reminder for application and type", async () => {
      const mockData = {
        id: "reminder-1",
        application_id: "app-1",
        user_id: "user-1",
        type: "no_response_follow_up",
        due_at: "2025-12-27T12:00:00Z",
        dismissed_at: null,
        created_at: "2025-12-27T11:00:00Z",
        updated_at: "2025-12-27T11:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await getActiveReminderByApplicationAndType({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
        type: "no_response_follow_up",
      });

      expect(mockSupabase.eq).toHaveBeenCalledWith("application_id", "app-1");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(mockSupabase.eq).toHaveBeenCalledWith("type", "no_response_follow_up");
      expect(mockSupabase.is).toHaveBeenCalledWith("dismissed_at", null);
      expect(result.id).toBe("reminder-1");
    });

    it("should return null when no active reminder found", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "PGRST116" },
        }),
      };

      const result = await getActiveReminderByApplicationAndType({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
        type: "no_response_follow_up",
      });

      expect(result).toBeNull();
    });

    it("should throw on database errors", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "DB_ERROR", message: "Query failed" },
        }),
      };

      await expect(
        getActiveReminderByApplicationAndType({
          supabase: mockSupabase,
          userId: "user-1",
          applicationId: "app-1",
          type: "no_response_follow_up",
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Query failed" });
    });
  });

  describe("snake_case to camelCase conversion", () => {
    it("should convert all fields correctly", async () => {
      const mockData = {
        id: "reminder-1",
        application_id: "app-1",
        user_id: "user-1",
        type: "no_response_follow_up",
        due_at: "2025-12-27T12:00:00Z",
        dismissed_at: "2025-12-27T13:00:00Z",
        created_at: "2025-12-27T11:00:00Z",
        updated_at: "2025-12-27T13:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await getReminderById({
        supabase: mockSupabase,
        userId: "user-1",
        id: "reminder-1",
      });

      expect(result).toEqual({
        id: "reminder-1",
        applicationId: "app-1",
        userId: "user-1",
        type: "no_response_follow_up",
        dueAt: "2025-12-27T12:00:00Z",
        dismissedAt: "2025-12-27T13:00:00Z",
        createdAt: "2025-12-27T11:00:00Z",
        updatedAt: "2025-12-27T13:00:00Z",
      });
    });
  });
});
