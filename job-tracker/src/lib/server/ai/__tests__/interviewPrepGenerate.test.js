/**
 * Tests for generateInterviewPrep AI helper
 */

import { generateInterviewPrep } from "../interviewPrepGenerate";

// Mock fetch globally
global.fetch = jest.fn();

describe("generateInterviewPrep", () => {
  const validParams = {
    company: "Test Corp",
    role: "Software Engineer",
    responsibilities: ["Lead team", "Design systems"],
    requirements: ["5+ years experience", "TypeScript"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Set default env vars
    process.env.JOB_OPENAI_API_KEY = "test-api-key";
    process.env.JOB_OPENAI_BASE_URL = "https://api.openai.com/v1";
    process.env.JOB_OPENAI_MODEL = "gpt-4o-mini";
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.JOB_OPENAI_API_KEY;
    delete process.env.JOB_OPENAI_BASE_URL;
    delete process.env.JOB_OPENAI_MODEL;
    delete process.env.JOB_OPENAI_FALLBACK_MODELS;
  });

  describe("Input Validation", () => {
    it("should throw INVALID_INPUT when company is missing", async () => {
      const params = { ...validParams, company: "" };

      await expect(generateInterviewPrep(params)).rejects.toMatchObject({
        code: "INVALID_INPUT",
        message: "Company and role are required",
      });
    });

    it("should throw INVALID_INPUT when role is missing", async () => {
      const params = { ...validParams, role: "" };

      await expect(generateInterviewPrep(params)).rejects.toMatchObject({
        code: "INVALID_INPUT",
        message: "Company and role are required",
      });
    });

    it("should throw INVALID_INPUT when responsibilities is not an array", async () => {
      const params = { ...validParams, responsibilities: "not an array" };

      await expect(generateInterviewPrep(params)).rejects.toMatchObject({
        code: "INVALID_INPUT",
        message: "Responsibilities and requirements must be arrays",
      });
    });

    it("should throw INVALID_INPUT when requirements is not an array", async () => {
      const params = { ...validParams, requirements: null };

      await expect(generateInterviewPrep(params)).rejects.toMatchObject({
        code: "INVALID_INPUT",
        message: "Responsibilities and requirements must be arrays",
      });
    });

    it("should throw INVALID_INPUT when both arrays are empty", async () => {
      const params = {
        ...validParams,
        responsibilities: [],
        requirements: [],
      };

      await expect(generateInterviewPrep(params)).rejects.toMatchObject({
        code: "INVALID_INPUT",
        message: "At least one responsibility or requirement is needed",
      });
    });

    it("should accept params with only responsibilities", async () => {
      const params = {
        ...validParams,
        requirements: [],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test question?",
                    category: "behavioral",
                    talkingPoints: ["Point 1"],
                    exampleAnswer: "Example",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      const result = await generateInterviewPrep(params);
      expect(result.questions).toHaveLength(1);
    });

    it("should accept params with only requirements", async () => {
      const params = {
        ...validParams,
        responsibilities: [],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test question?",
                    category: "technical",
                    talkingPoints: ["Point 1"],
                    exampleAnswer: "Example",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      const result = await generateInterviewPrep(params);
      expect(result.questions).toHaveLength(1);
    });
  });

  describe("Environment Configuration", () => {
    it("should throw AI_NOT_CONFIGURED when API key is missing", async () => {
      delete process.env.JOB_OPENAI_API_KEY;

      await expect(generateInterviewPrep(validParams)).rejects.toMatchObject({
        code: "AI_NOT_CONFIGURED",
        message: "AI provider not configured",
      });
    });

    it("should throw AI_NOT_CONFIGURED when base URL is invalid", async () => {
      process.env.JOB_OPENAI_BASE_URL = "";

      await expect(generateInterviewPrep(validParams)).rejects.toMatchObject({
        code: "AI_NOT_CONFIGURED",
        message: "AI base URL is invalid",
      });
    });

    it("should use default model when JOB_OPENAI_MODEL is not set", async () => {
      delete process.env.JOB_OPENAI_MODEL;

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test?",
                    category: "behavioral",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      await generateInterviewPrep(validParams);

      const fetchCall = global.fetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.model).toBe("gpt-4o-mini"); // DEFAULT_MODEL
    });
  });

  describe("Focus Responsibilities", () => {
    it("should use focusResponsibilities when provided", async () => {
      const params = {
        ...validParams,
        focusResponsibilities: ["Lead team"],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test?",
                    category: "behavioral",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      await generateInterviewPrep(params);

      const fetchCall = global.fetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const userMessage = body.messages.find((m) => m.role === "user");

      // Should use focus responsibilities in the prompt
      expect(userMessage.content).toContain("Lead team");
      expect(userMessage.content).not.toContain("Design systems");
    });

    it("should use all responsibilities when focusResponsibilities is empty", async () => {
      const params = {
        ...validParams,
        focusResponsibilities: [],
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test?",
                    category: "behavioral",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      await generateInterviewPrep(params);

      const fetchCall = global.fetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const userMessage = body.messages.find((m) => m.role === "user");

      // Should use all responsibilities when focus is empty
      expect(userMessage.content).toContain("Lead team");
      expect(userMessage.content).toContain("Design systems");
    });

    it("should handle non-array focusResponsibilities gracefully", async () => {
      const params = {
        ...validParams,
        focusResponsibilities: null,
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test?",
                    category: "behavioral",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      // Should not throw, should fall back to all responsibilities
      const result = await generateInterviewPrep(params);
      expect(result.questions).toHaveLength(1);
    });
  });

  describe("Company Context", () => {
    it("should include company context in prompt when provided", async () => {
      const params = {
        ...validParams,
        companyContext: "Fast-growing startup in fintech",
      };

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test?",
                    category: "company-specific",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      await generateInterviewPrep(params);

      const fetchCall = global.fetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const userMessage = body.messages.find((m) => m.role === "user");

      expect(userMessage.content).toContain("Company Context/Notes:");
      expect(userMessage.content).toContain("Fast-growing startup in fintech");
    });

    it("should not include company context section when not provided", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test?",
                    category: "behavioral",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      await generateInterviewPrep(validParams);

      const fetchCall = global.fetch.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      const userMessage = body.messages.find((m) => m.role === "user");

      expect(userMessage.content).not.toContain("Company Context/Notes:");
    });
  });

  describe("AI Response Handling", () => {
    it("should successfully generate pack with valid response", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "How do you handle conflicts?",
                    category: "behavioral",
                    talkingPoints: ["Point 1", "Point 2", "Point 3"],
                    exampleAnswer: "Use STAR method...",
                  },
                  {
                    question: "Explain TypeScript generics",
                    category: "technical",
                    talkingPoints: ["Generic syntax", "Constraints"],
                    exampleAnswer: "Generics allow...",
                  },
                ],
                keyThemes: ["Leadership", "Technical depth"],
                companyResearchTips: [
                  "Research company culture",
                  "Review recent news",
                ],
                questionsToAsk: [
                  "What is the team structure?",
                  "How do you measure success?",
                ],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      const result = await generateInterviewPrep(validParams);

      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].question).toBe("How do you handle conflicts?");
      expect(result.questions[0].category).toBe("behavioral");
      expect(result.questions[0].talkingPoints).toHaveLength(3);
      expect(result.keyThemes).toEqual(["Leadership", "Technical depth"]);
      expect(result.companyResearchTips).toHaveLength(2);
      expect(result.questionsToAsk).toHaveLength(2);
      expect(result.generatedAt).toBeDefined();
      expect(result.model).toBe("gpt-4o-mini");
    });

    it("should throw AI_REQUEST_FAILED when API returns non-OK status", async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: jest.fn().mockResolvedValue("Internal server error"),
      });

      await expect(generateInterviewPrep(validParams)).rejects.toMatchObject({
        code: "AI_REQUEST_FAILED",
      });
    });

    it("should throw AI_RESPONSE_INVALID when response is missing questions", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                // Missing questions array
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      await expect(generateInterviewPrep(validParams)).rejects.toMatchObject({
        code: "AI_RESPONSE_INVALID",
      });
    });

    it("should limit questions to maximum 10", async () => {
      const questions = Array.from({ length: 15 }, (_, i) => ({
        question: `Question ${i + 1}`,
        category: "behavioral",
        talkingPoints: [],
        exampleAnswer: "",
      }));

      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions,
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      const result = await generateInterviewPrep(validParams);
      expect(result.questions).toHaveLength(10);
    });

    it("should filter out questions with empty question text", async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Valid question?",
                    category: "behavioral",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                  {
                    question: "",
                    category: "behavioral",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                  {
                    question: "Another valid?",
                    category: "technical",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      const result = await generateInterviewPrep(validParams);
      expect(result.questions).toHaveLength(2);
      expect(result.questions[0].question).toBe("Valid question?");
      expect(result.questions[1].question).toBe("Another valid?");
    });
  });

  describe("Timeout Handling", () => {
    it("should throw AI_TIMEOUT when request exceeds timeout", async () => {
      global.fetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true }), 100000);
          })
      );

      const promise = generateInterviewPrep(validParams);

      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(90001);

      await expect(promise).rejects.toMatchObject({
        code: "AI_TIMEOUT",
        message: "AI request timed out",
      });
    });
  });

  describe("Fallback Models", () => {
    it("should try fallback models when primary fails", async () => {
      process.env.JOB_OPENAI_MODEL = "gpt-4o";
      process.env.JOB_OPENAI_FALLBACK_MODELS = "gpt-4o-mini,gpt-3.5-turbo";

      // First model fails
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: jest.fn().mockResolvedValue("Model not found"),
      });

      // Second model succeeds
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                questions: [
                  {
                    question: "Test?",
                    category: "behavioral",
                    talkingPoints: [],
                    exampleAnswer: "",
                  },
                ],
                keyThemes: [],
                companyResearchTips: [],
                questionsToAsk: [],
              }),
            },
          },
        ],
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        text: jest.fn().mockResolvedValue(JSON.stringify(mockResponse)),
      });

      const result = await generateInterviewPrep(validParams);

      expect(result.questions).toHaveLength(1);
      expect(result.model).toBe("gpt-4o-mini");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
