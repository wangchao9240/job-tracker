/**
 * Unit tests for statusEventsRepo
 * Tests event creation and retrieval functions
 */

import {
  listStatusEvents,
  insertStatusEvent,
  insertStatusEvents,
} from "../statusEventsRepo.js";

describe("statusEventsRepo", () => {
  describe("listStatusEvents", () => {
    it("should list events for an application newest-first", async () => {
      const mockData = [
        {
          id: "event-2",
          application_id: "app-1",
          user_id: "user-1",
          event_type: "status_changed",
          payload: { from: "applied", to: "interviewing" },
          created_at: "2025-12-27T12:00:00Z",
        },
        {
          id: "event-1",
          application_id: "app-1",
          user_id: "user-1",
          event_type: "status_changed",
          payload: { from: "draft", to: "applied" },
          created_at: "2025-12-27T11:00:00Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await listStatusEvents({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("application_status_events");
      expect(mockSupabase.eq).toHaveBeenCalledWith("application_id", "app-1");
      expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: false });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("event-2");
      expect(result[0].eventType).toBe("status_changed");
      expect(result[0].payload).toEqual({ from: "applied", to: "interviewing" });
    });

    it("should return empty array when no events exist", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      };

      const result = await listStatusEvents({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
      });

      expect(result).toEqual([]);
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
        listStatusEvents({
          supabase: mockSupabase,
          userId: "user-1",
          applicationId: "app-1",
        })
      ).rejects.toEqual({ code: "DB_ERROR", message: "Query failed" });
    });

    it("should convert snake_case to camelCase", async () => {
      const mockData = [
        {
          id: "event-1",
          application_id: "app-1",
          user_id: "user-1",
          event_type: "field_changed",
          payload: { field: "company", from: "Old", to: "New" },
          created_at: "2025-12-27T12:00:00Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await listStatusEvents({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
      });

      expect(result[0]).toEqual({
        id: "event-1",
        applicationId: "app-1",
        userId: "user-1",
        eventType: "field_changed",
        payload: { field: "company", from: "Old", to: "New" },
        createdAt: "2025-12-27T12:00:00Z",
      });
    });
  });

  describe("insertStatusEvent", () => {
    it("should insert a single event", async () => {
      const mockData = {
        id: "event-1",
        application_id: "app-1",
        user_id: "user-1",
        event_type: "status_changed",
        payload: { from: "draft", to: "applied" },
        created_at: "2025-12-27T12:00:00Z",
      };

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await insertStatusEvent({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
        eventType: "status_changed",
        payload: { from: "draft", to: "applied" },
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("application_status_events");
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        application_id: "app-1",
        user_id: "user-1",
        event_type: "status_changed",
        payload: { from: "draft", to: "applied" },
      });
      expect(result.eventType).toBe("status_changed");
      expect(result.payload).toEqual({ from: "draft", to: "applied" });
    });

    it("should throw on insert error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "INSERT_ERROR", message: "Insert failed" },
        }),
      };

      await expect(
        insertStatusEvent({
          supabase: mockSupabase,
          userId: "user-1",
          applicationId: "app-1",
          eventType: "status_changed",
          payload: { from: "draft", to: "applied" },
        })
      ).rejects.toEqual({ code: "INSERT_ERROR", message: "Insert failed" });
    });
  });

  describe("insertStatusEvents", () => {
    it("should insert multiple events", async () => {
      const mockData = [
        {
          id: "event-1",
          application_id: "app-1",
          user_id: "user-1",
          event_type: "status_changed",
          payload: { from: "draft", to: "applied" },
          created_at: "2025-12-27T12:00:00Z",
        },
        {
          id: "event-2",
          application_id: "app-1",
          user_id: "user-1",
          event_type: "field_changed",
          payload: { field: "company", from: "Old", to: "New" },
          created_at: "2025-12-27T12:00:01Z",
        },
      ];

      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: mockData,
          error: null,
        }),
      };

      const result = await insertStatusEvents({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
        events: [
          {
            eventType: "status_changed",
            payload: { from: "draft", to: "applied" },
          },
          {
            eventType: "field_changed",
            payload: { field: "company", from: "Old", to: "New" },
          },
        ],
      });

      expect(mockSupabase.insert).toHaveBeenCalledWith([
        {
          application_id: "app-1",
          user_id: "user-1",
          event_type: "status_changed",
          payload: { from: "draft", to: "applied" },
        },
        {
          application_id: "app-1",
          user_id: "user-1",
          event_type: "field_changed",
          payload: { field: "company", from: "Old", to: "New" },
        },
      ]);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no events provided", async () => {
      const mockSupabase = {};

      const result = await insertStatusEvents({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
        events: [],
      });

      expect(result).toEqual([]);
    });

    it("should return empty array when events is null", async () => {
      const mockSupabase = {};

      const result = await insertStatusEvents({
        supabase: mockSupabase,
        userId: "user-1",
        applicationId: "app-1",
        events: null,
      });

      expect(result).toEqual([]);
    });

    it("should throw on bulk insert error", async () => {
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: { code: "BULK_INSERT_ERROR", message: "Bulk insert failed" },
        }),
      };

      await expect(
        insertStatusEvents({
          supabase: mockSupabase,
          userId: "user-1",
          applicationId: "app-1",
          events: [
            {
              eventType: "status_changed",
              payload: { from: "draft", to: "applied" },
            },
          ],
        })
      ).rejects.toEqual({ code: "BULK_INSERT_ERROR", message: "Bulk insert failed" });
    });
  });
});
