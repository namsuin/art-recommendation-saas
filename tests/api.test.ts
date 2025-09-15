import { test, expect } from "bun:test";

test("Health check endpoint", async () => {
  const response = await fetch("http://localhost:3000/api/health");
  expect(response.status).toBe(200);
  
  const data = await response.json();
  expect(data.status).toBe("healthy");
  expect(data.services).toBeDefined();
});

test("API response format", async () => {
  const response = await fetch("http://localhost:3000/api/health");
  const data = await response.json();
  
  // 타입 안전성 테스트
  expect(typeof data.status).toBe("string");
  expect(typeof data.timestamp).toBe("string");
  expect(typeof data.services).toBe("object");
});